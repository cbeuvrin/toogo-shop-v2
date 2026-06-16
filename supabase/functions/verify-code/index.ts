import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Max wrong tries per code before it's invalidated (forces requesting a new one).
const MAX_ATTEMPTS = 5;

interface VerifyRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email y código son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: fetch the latest unused code for this email BY EMAIL (not by code),
    // so we can count attempts and rate-limit. Looking it up by code would let an
    // attacker brute-force the 6-digit code with unlimited tries.
    const { data: record } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return new Response(
        JSON.stringify({ success: false, error: "Código de verificación inválido o expirado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Expired?
    if (new Date() > new Date(record.expires_at)) {
      return new Response(
        JSON.stringify({ success: false, error: "El código de verificación ha expirado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Too many wrong tries → invalidate and force a new code.
    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase.from('verification_codes').update({ used: true }).eq('id', record.id);
      return new Response(
        JSON.stringify({ success: false, error: "Demasiados intentos. Solicita un código nuevo." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Wrong code → count the failed attempt (and invalidate if it hits the cap).
    if (record.code !== code) {
      const newAttempts = (record.attempts ?? 0) + 1;
      await supabase
        .from('verification_codes')
        .update({ attempts: newAttempts, ...(newAttempts >= MAX_ATTEMPTS ? { used: true } : {}) })
        .eq('id', record.id);
      return new Response(
        JSON.stringify({ success: false, error: "Código de verificación inválido o expirado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Correct code → consume it.
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', record.id);

    if (updateError) {
      console.error('Error marking code as used:', updateError);
      throw new Error('Failed to update verification code');
    }

    console.log(`Verification successful for ${email}`);
    return new Response(
      JSON.stringify({ success: true, message: "Código verificado correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Error interno del servidor", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
