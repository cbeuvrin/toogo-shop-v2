/**
 * mercadopago-oauth-start
 *
 * Genera la URL de autorización OAuth de MercadoPago para que el tenant conecte su cuenta.
 *
 * Flujo:
 *  1. Frontend invoca con tenantId
 *  2. Generamos un `state` aleatorio + lo guardamos en DB (oauth_states) con expiración
 *  3. Devolvemos la URL completa a MP
 *  4. Frontend redirige al cliente a esa URL
 *  5. Cliente autoriza en MP
 *  6. MP redirige a /mercadopago-connected?code=...&state=...
 *  7. Callback function intercambia code por tokens (ver mercadopago-oauth-callback)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId } = await req.json();
    if (!tenantId) throw new Error("tenantId is required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(
      supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validar que el usuario tenga rol sobre el tenant
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!role) {
      const { data: superAdmin } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
      if (!superAdmin) {
        return new Response(JSON.stringify({ error: "Sin permisos sobre este tenant" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const clientId = Deno.env.get("MP_OAUTH_CLIENT_ID");
    if (!clientId) throw new Error("MP_OAUTH_CLIENT_ID not configured");

    // Generar state aleatorio para protección CSRF.
    // Lo codificamos como JWT-like ligero: tenantId + nonce + timestamp.
    // En el callback lo desencriptamos y validamos.
    const nonce = crypto.randomUUID();
    const stateData = {
      tenant_id: tenantId,
      user_id: user.id,
      nonce,
      created_at: Date.now(),
    };
    const state = btoa(JSON.stringify(stateData));

    // Guardamos el state en metadata del payment_integration tentativo
    // para validarlo en el callback (defensa contra CSRF + reemplay).
    await supabase
      .from("tenant_payment_integrations")
      .upsert({
        tenant_id: tenantId,
        provider: "mercadopago",
        status: "pending_authorization",
        metadata: { oauth_state_nonce: nonce, oauth_started_at: new Date().toISOString() },
      }, { onConflict: "tenant_id,provider" });

    const redirectUri = "https://www.toogo.store/mercadopago-connected";
    const authUrl = new URL("https://auth.mercadopago.com.mx/authorization");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    console.log(`[OAuth Start] Tenant ${tenantId} starting MP OAuth`);

    return new Response(
      JSON.stringify({ success: true, auth_url: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[mercadopago-oauth-start] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
