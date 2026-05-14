/**
 * process-renewal-payment
 *
 * Procesa el pago embebido (MercadoPago Bricks) para una renovación de dominio.
 *
 * Flujo:
 *  1. Frontend manda token de tarjeta + datos
 *  2. Creamos el payment en MP con metadata.type='domain_renewal'
 *  3. Si approved → invocamos renew-domain-manually directo (no esperamos webhook)
 *  4. Retornamos status al frontend para cerrar el modal con éxito
 *
 * Nota: el webhook MP también procesa renovaciones (defensa en profundidad),
 * pero invocarlo directo desde acá da feedback inmediato al usuario.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { MercadoPagoConfig, Payment } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renewalId, paymentData } = await req.json();
    if (!renewalId) throw new Error("renewalId is required");
    if (!paymentData?.token) throw new Error("paymentData.token is required");

    // Auth
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

    // Cargar renewal y validar permiso
    const { data: renewal, error: renewalErr } = await supabase
      .from("domain_renewals")
      .select("id, tenant_id, domain, price_mxn, status")
      .eq("id", renewalId)
      .single();
    if (renewalErr || !renewal) throw new Error("Renewal not found");

    if (renewal.status === "renewed") {
      return new Response(JSON.stringify({ error: "Este dominio ya fue renovado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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
        return new Response(JSON.stringify({ error: "Sin permisos" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Cobrar con MercadoPago
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");

    const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const paymentClient = new Payment(mpClient);

    const transactionAmount = Number(Number(renewal.price_mxn || 290).toFixed(2));

    console.log(`[Renewal Payment] Charging ${transactionAmount} MXN for ${renewal.domain}`);

    let paymentResult;
    try {
      paymentResult = await paymentClient.create({
        body: {
          transaction_amount: transactionAmount,
          token: paymentData.token,
          description: `Renovación de dominio: ${renewal.domain}`,
          payment_method_id: paymentData.payment_method_id,
          installments: paymentData.installments || 1,
          payer: paymentData.payer,
          external_reference: `renewal-${renewal.id}`,
          metadata: {
            type: "domain_renewal",
            renewal_id: renewal.id,
            domain: renewal.domain,
            tenant_id: renewal.tenant_id,
          },
          ...(paymentData.issuer_id && { issuer_id: paymentData.issuer_id }),
        },
        requestOptions: {
          idempotencyKey: `${user.id}_renewal_${renewal.id}_${Date.now()}`,
        },
      });
    } catch (err: any) {
      console.error("[Renewal Payment] MP error:", err);
      return new Response(
        JSON.stringify({ success: false, error: err.message || "Error al procesar el pago" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Renewal Payment] MP result: status=${paymentResult.status}, id=${paymentResult.id}`);

    // Si está aprobado, disparar la renovación inmediatamente
    if (paymentResult.status === "approved") {
      try {
        const { error: renewError } = await supabase.functions.invoke("renew-domain-manually", {
          body: {
            renewalId: renewal.id,
            paymentRef: paymentResult.id?.toString(),
            source: "embedded_payment",
          },
        });
        if (renewError) {
          console.error("[Renewal Payment] renew-domain-manually failed:", renewError);
          // El pago ya está cobrado — devolvemos success al user pero el webhook MP
          // también va a intentar renovar como fallback.
        }
      } catch (renewErr) {
        console.error("[Renewal Payment] Error invoking renew:", renewErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: paymentResult.status === "approved",
        payment: {
          id: paymentResult.id,
          status: paymentResult.status,
          status_detail: paymentResult.status_detail,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[process-renewal-payment] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
