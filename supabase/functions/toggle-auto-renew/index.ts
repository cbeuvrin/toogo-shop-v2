/**
 * toggle-auto-renew
 *
 * Activa o desactiva la auto-renovación de un dominio.
 *
 * Activar:
 *  1. Verifica que no exista un preapproval previo (idempotencia)
 *  2. Crea un MercadoPago Preapproval con auto_recurring anual
 *  3. Devuelve `init_point` para que el cliente autorice su tarjeta
 *  4. Marca auto_renew=true tentativo (definitivo cuando el webhook confirme authorized)
 *
 * Desactivar:
 *  1. Cancela el preapproval en MP (status='cancelled')
 *  2. Limpia mercadopago_preapproval_id y auto_renew=false
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renewalId, enabled } = await req.json();
    if (!renewalId) throw new Error("renewalId is required");
    if (typeof enabled !== "boolean") throw new Error("enabled (boolean) is required");

    // Auth: solo el dueño del tenant puede tocar este toggle
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

    // Cargar renewal y validar permisos
    const { data: renewal, error: renewalErr } = await supabase
      .from("domain_renewals")
      .select("id, tenant_id, domain, price_mxn, next_renewal_date, auto_renew, mercadopago_preapproval_id, status")
      .eq("id", renewalId)
      .single();
    if (renewalErr || !renewal) throw new Error("Renewal not found");

    if (renewal.status === "renewed" || renewal.status === "expired") {
      throw new Error(`No se puede modificar auto-renovación: estado actual ${renewal.status}`);
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

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");

    const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preapprovalClient = new PreApproval(mpClient);

    // ─────────────────────────────────────────────
    // CASO 1: DESACTIVAR auto-renovación
    // ─────────────────────────────────────────────
    if (!enabled) {
      if (renewal.mercadopago_preapproval_id) {
        try {
          await preapprovalClient.update({
            id: renewal.mercadopago_preapproval_id,
            body: { status: "cancelled" },
          });
          console.log(`[toggle-auto-renew] Cancelled preapproval ${renewal.mercadopago_preapproval_id}`);
        } catch (err: any) {
          console.warn(`[toggle-auto-renew] Could not cancel MP preapproval:`, err.message);
          // Continuamos igual — el usuario quiere desactivar, no podemos bloquearlo si MP falla
        }
      }

      await supabase
        .from("domain_renewals")
        .update({
          auto_renew: false,
          mercadopago_preapproval_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", renewalId);

      return new Response(
        JSON.stringify({ success: true, auto_renew: false, message: "Auto-renovación desactivada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────
    // CASO 2: ACTIVAR auto-renovación
    // ─────────────────────────────────────────────
    if (renewal.mercadopago_preapproval_id) {
      // Ya tiene preapproval — verificar estado en MP
      try {
        const existing = await preapprovalClient.get({ id: renewal.mercadopago_preapproval_id });
        if (existing.status === "authorized") {
          return new Response(
            JSON.stringify({
              success: true,
              auto_renew: true,
              already_authorized: true,
              message: "La auto-renovación ya está activa",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (existing.status === "pending") {
          return new Response(
            JSON.stringify({
              success: true,
              auto_renew: true,
              init_point: existing.init_point,
              pending_authorization: true,
              message: "Tu autorización está pendiente. Completá la autorización con tu tarjeta.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err: any) {
        console.warn(`[toggle-auto-renew] Could not get existing preapproval, creating new:`, err.message);
      }
    }

    // Crear preapproval anual con fecha de inicio = fecha de vencimiento del dominio
    // MP cobrará automáticamente cada 12 meses a partir de esa fecha.
    const startDate = new Date(renewal.next_renewal_date);
    const priceMxn = Number(renewal.price_mxn || 290);
    const baseUrl = "https://www.toogo.store";

    const preapproval = await preapprovalClient.create({
      body: {
        reason: `Auto-renovación dominio ${renewal.domain}`,
        external_reference: `domain-renewal-${renewal.id}`,
        auto_recurring: {
          frequency: 12,
          frequency_type: "months",
          transaction_amount: priceMxn,
          currency_id: "MXN",
          start_date: startDate.toISOString(),
        },
        back_url: `${baseUrl}/dashboard?tab=mis-dominios&auto_renew_activated=${encodeURIComponent(renewal.domain)}`,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        payer_email: user.email,
      },
    });

    console.log(`[toggle-auto-renew] Created preapproval ${preapproval.id} for ${renewal.domain}, starts ${startDate.toISOString()}`);

    // Guardamos auto_renew=true tentativo. El webhook lo va a confirmar como `authorized`
    // cuando el cliente complete el flujo de autorización en MP.
    await supabase
      .from("domain_renewals")
      .update({
        auto_renew: true,
        mercadopago_preapproval_id: preapproval.id,
        updated_at: new Date().toISOString(),
        metadata: { ...(renewal as any).metadata, auto_renew_activated_at: new Date().toISOString() },
      })
      .eq("id", renewalId);

    return new Response(
      JSON.stringify({
        success: true,
        auto_renew: true,
        init_point: preapproval.init_point,
        preapproval_id: preapproval.id,
        message: "Autoriza tu tarjeta con MercadoPago para activar la renovación automática",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[toggle-auto-renew] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
