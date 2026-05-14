/**
 * mercadopago-oauth-callback
 *
 * Recibe el `code` que MP envía después de autorización, lo intercambia por:
 *   - access_token (válido 6 meses)
 *   - refresh_token (para renovar)
 *   - public_key (para frontend Brick)
 *   - user_id (cuenta MP del tenant)
 *
 * Valida el `state` contra el nonce guardado al iniciar (defensa CSRF).
 * Guarda los tokens en `tenant_payment_integrations`.
 *
 * Esta función es llamada por la página /mercadopago-connected del frontend
 * cuando MP redirige al cliente con los params en la URL.
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
    const { code, state } = await req.json();
    if (!code || !state) throw new Error("code y state son requeridos");

    // 1. Decodificar y validar el state (CSRF protection)
    let stateData: any;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error("State inválido");
    }

    const { tenant_id, user_id, nonce, created_at } = stateData;
    if (!tenant_id || !nonce) throw new Error("State incompleto");

    // Validar que no haya pasado más de 30 minutos desde que se generó
    const ageMs = Date.now() - (created_at || 0);
    if (ageMs > 30 * 60 * 1000) {
      throw new Error("El proceso de autorización expiró. Inicia de nuevo.");
    }

    // 2. Verificar caller con JWT
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
    if (!user || user.id !== user_id) {
      return new Response(JSON.stringify({ error: "User mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Validar nonce contra lo que guardamos en oauth-start
    const { data: pending } = await supabase
      .from("tenant_payment_integrations")
      .select("id, metadata")
      .eq("tenant_id", tenant_id)
      .eq("provider", "mercadopago")
      .single();

    if (!pending) throw new Error("No hay flujo OAuth iniciado");
    const expectedNonce = (pending.metadata as any)?.oauth_state_nonce;
    if (expectedNonce !== nonce) {
      throw new Error("State no coincide (posible CSRF)");
    }

    // 4. Intercambiar code por tokens en la API de MP
    const clientId = Deno.env.get("MP_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MP_OAUTH_CLIENT_SECRET")!;
    const redirectUri = "https://www.toogo.store/mercadopago-connected";

    console.log(`[OAuth Callback] Exchanging code for tokens, tenant=${tenant_id}`);

    const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[OAuth Callback] MP token exchange failed:", tokenRes.status, errBody);
      throw new Error(`MP rechazó el code: ${tokenRes.status} ${errBody.substring(0, 200)}`);
    }

    const tokens = await tokenRes.json();
    console.log("[OAuth Callback] Tokens received:", {
      user_id: tokens.user_id,
      scope: tokens.scope,
      expires_in: tokens.expires_in,
    });

    // 5. Obtener info del usuario MP (email, name) para mostrar en UI
    let mpUserEmail: string | null = null;
    let mpUserNickname: string | null = null;
    try {
      const userRes = await fetch(`https://api.mercadopago.com/users/${tokens.user_id}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) {
        const mpUser = await userRes.json();
        mpUserEmail = mpUser.email || null;
        mpUserNickname = mpUser.nickname || null;
      }
    } catch (err) {
      console.warn("[OAuth Callback] Could not fetch MP user info:", err);
    }

    // 6. Guardar tokens en tenant_payment_integrations
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 15552000) * 1000).toISOString();

    const { error: upsertErr } = await supabase
      .from("tenant_payment_integrations")
      .update({
        provider_user_id: tokens.user_id?.toString(),
        provider_user_email: mpUserEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        public_key: tokens.public_key,
        scope: tokens.scope,
        token_type: tokens.token_type || "bearer",
        expires_at: expiresAt,
        status: "active",
        connected_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        revoked_at: null,
        metadata: {
          mp_nickname: mpUserNickname,
          connected_via: "oauth",
          authorized_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant_id)
      .eq("provider", "mercadopago");

    if (upsertErr) throw upsertErr;

    // 7. Para compatibilidad temporal con el código viejo: también guardamos public_key
    // en tenant_settings para que el Brick siga funcionando sin que reescribamos todo
    // de una. Después de migrar todo, dejamos de leerlo de ahí.
    await supabase
      .from("tenant_settings")
      .update({ mercadopago_public_key: tokens.public_key })
      .eq("tenant_id", tenant_id);

    console.log(`[OAuth Callback] ✅ MP integration active for tenant ${tenant_id}, mp_user=${tokens.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        mp_user_id: tokens.user_id,
        mp_user_email: mpUserEmail,
        mp_user_nickname: mpUserNickname,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[mercadopago-oauth-callback] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
