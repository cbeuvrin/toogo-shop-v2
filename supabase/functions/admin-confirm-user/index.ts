import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  email: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ConfirmRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "El email es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[admin-confirm-user] Looking up user by email: ${email}`);

    // List users and find by email (GoTrue Admin API)
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
      console.log(`[admin-confirm-user] User already confirmed: ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, alreadyConfirmed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[admin-confirm-user] Confirming user id: ${user.id}`);
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