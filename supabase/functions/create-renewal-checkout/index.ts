/**
 * create-renewal-checkout
 *
 * Genera una preferencia de pago en MercadoPago para renovar un dominio.
 *
 * Flujo:
 *  Cliente click "Renovar ahora" → frontend invoca esta función con renewalId
 *  → genera preference MP con metadata.type='domain_renewal'
 *  → devuelve init_point (URL del checkout)
 *  → frontend redirige al usuario
 *  → cuando MP confirma pago, webhook detecta metadata y dispara renew-domain-manually
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { MercadoPagoConfig, Preference } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renewalId } = await req.json();
    if (!renewalId) throw new Error("renewalId is required");

    // Auth: solo el dueño del tenant puede generar checkout
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
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Cargar renewal + verificar que el caller tenga rol sobre ese tenant
    const { data: renewal, error: renewalErr } = await supabase
      .from("domain_renewals")
      .select("id, tenant_id, domain, price_mxn, status, next_renewal_date")
      .eq("id", renewalId)
      .single();
    if (renewalErr || !renewal) throw new Error("Renewal not found");

    if (renewal.status === "renewed") {
      return new Response(
        JSON.stringify({ error: "Este dominio ya fue renovado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", renewal.tenant_id)
      .maybeSingle();

    if (!role) {
      const { data: superAdmin } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
      if (!superAdmin) {
        return new Response(JSON.stringify({ error: "Sin permisos sobre este dominio" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");

    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preferenceClient = new Preference(client);

    const baseUrl = "https://www.toogo.store";
    const priceMxn = Number(renewal.price_mxn || 290);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `renewal-${renewal.id}`,
            title: `Renovación de dominio: ${renewal.domain}`,
            description: `Renovación por 1 año del dominio ${renewal.domain}`,
            quantity: 1,
            unit_price: priceMxn,
            currency_id: "MXN",
            category_id: "services",
          },
        ],
        payer: {
          email: user.email,
        },
        metadata: {
          type: "domain_renewal",
          renewal_id: renewal.id,
          domain: renewal.domain,
          tenant_id: renewal.tenant_id,
        },
        external_reference: `renewal-${renewal.id}`,
        back_urls: {
          success: `${baseUrl}/dashboard?tab=mis-dominios&renewed=${encodeURIComponent(renewal.domain)}`,
          failure: `${baseUrl}/dashboard?tab=mis-dominios&renewal_failed=${encodeURIComponent(renewal.domain)}`,
          pending: `${baseUrl}/dashboard?tab=mis-dominios&renewal_pending=${encodeURIComponent(renewal.domain)}`,
        },
        auto_return: "approved",
        statement_descriptor: "TOOGO RENEWAL",
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      },
    });

    console.log(`[Renewal Checkout] Created preference ${preference.id} for ${renewal.domain}`);

    return new Response(
      JSON.stringify({
        success: true,
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[create-renewal-checkout] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
