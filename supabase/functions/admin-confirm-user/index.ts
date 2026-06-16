import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  email: string;
  password: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password }: ConfirmRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email y contraseña son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: this endpoint auto-confirms an email, so it MUST prove the caller
    // owns the account. The user has no session yet (that's precisely why the
    // onboarding flow calls this — their sign-in failed with "email not confirmed"),
    // so we can't verify a JWT. Instead we validate the PASSWORD: only the owner,
    // who just set it during sign-up, knows it. Without this, anyone could confirm
    // (and hijack) an arbitrary account, bypassing email verification entirely.
    const anon = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await anon.auth.signInWithPassword({ email, password });

    if (!signInError) {
      // Correct password AND already confirmed → nothing to do.
      return new Response(
        JSON.stringify({ success: true, alreadyConfirmed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // GoTrue checks the password before the "email confirmed" gate, so a
    // "not confirmed" error means the password is correct and the account is just
    // pending confirmation. Any other error (invalid credentials) → reject.
    const msg = (signInError.message || "").toLowerCase();
    const passwordIsValidButUnconfirmed = msg.includes("confirm");
    if (!passwordIsValidButUnconfirmed) {
      console.warn(`[admin-confirm-user] Rejected: invalid credentials for ${email}`);
      return new Response(
        JSON.stringify({ success: false, error: "Credenciales inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[admin-confirm-user] Password verified, confirming: ${email}`);

    // Look up the user (service role) and confirm the email.
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      console.error("listUsers error", listError);
      return new Response(
        JSON.stringify({ success: false, error: "No se pudo listar usuarios" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = list.users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (!user) {
      console.warn(`[admin-confirm-user] User not found for email: ${email}`);
      return new Response(
        JSON.stringify({ success: false, error: "Usuario no encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ success: true, alreadyConfirmed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (updateError) {
      console.error("updateUserById error", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "No se pudo confirmar el correo" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: updated.user?.id ?? user.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("[admin-confirm-user] Unexpected error", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
