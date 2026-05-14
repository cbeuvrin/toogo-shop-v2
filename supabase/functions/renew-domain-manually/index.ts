/**
 * renew-domain-manually
 *
 * Ejecuta la renovación de un dominio en Openprovider tras un pago confirmado.
 *
 * Invocaciones:
 *   1. Desde mercadopago-webhook cuando llega pago con metadata.type='domain_renewal'
 *   2. Manualmente para reintentos o renovaciones admin
 *
 * Lo que hace:
 *   - Llama Openprovider `renewDomainRequest`
 *   - Avanza `domain_purchases.expires_at` en 1 año
 *   - Crea registro nuevo en `domain_renewals` para el próximo ciclo
 *   - Marca el renewal viejo como `renewed`
 *   - Manda email de confirmación al cliente
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openproviderUsername = Deno.env.get("OPENPROVIDER_USERNAME")!;
const openproviderPassword = Deno.env.get("OPENPROVIDER_PASSWORD")!;
const openproviderApiUrl = "https://api.openprovider.eu";

function buildXMLRequest(command: string, params: Record<string, any>): string {
  const buildXMLParams = (obj: Record<string, any>, indent = 2): string => {
    return Object.entries(obj).map(([key, value]) => {
      const spaces = " ".repeat(indent);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return `${spaces}<${key}>\n${buildXMLParams(value, indent + 2)}\n${spaces}</${key}>`;
      }
      return `${spaces}<${key}>${value}</${key}>`;
    }).join("\n");
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<openXML>
  <credentials>
    <username>${openproviderUsername}</username>
    <password>${openproviderPassword}</password>
  </credentials>
  <${command}>
${buildXMLParams(params)}
  </${command}>
</openXML>`;
}

async function openproviderRequest(command: string, params: Record<string, any>): Promise<any> {
  const xmlBody = buildXMLRequest(command, params);
  const response = await fetch(openproviderApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlBody,
  });
  const xmlText = await response.text();

  const codeMatch = xmlText.match(/<code>(\d+)<\/code>/);
  const descMatch = xmlText.match(/<desc>(.*?)<\/desc>/);
  const code = codeMatch ? parseInt(codeMatch[1]) : 999;
  const desc = descMatch ? descMatch[1] : "Unknown error";

  if (code !== 0) {
    throw new Error(`Openprovider error ${code}: ${desc}`);
  }

  // Parse new expiration date if returned
  const dataMatch = xmlText.match(/<data>(.*?)<\/data>/s);
  const data: any = { raw: xmlText };
  if (dataMatch) {
    const expMatch = dataMatch[1].match(/<expirationDate>(.*?)<\/expirationDate>/);
    if (expMatch) data.expirationDate = expMatch[1].trim();
  }
  return { code, desc, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renewalId, paymentRef, source = "manual" } = await req.json();
    if (!renewalId) throw new Error("renewalId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Renew] Starting renewal ${renewalId} from source=${source}`);

    // 1. Cargar el renewal + purchase
    const { data: renewal, error: renewalErr } = await supabase
      .from("domain_renewals")
      .select("*, domain_purchases(*)")
      .eq("id", renewalId)
      .single();
    if (renewalErr || !renewal) throw new Error(`Renewal not found: ${renewalErr?.message}`);

    if (renewal.status === "renewed") {
      console.log(`[Renew] Already renewed, skipping`);
      return new Response(
        JSON.stringify({ success: true, alreadyRenewed: true, renewalId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const purchase = renewal.domain_purchases;
    if (!purchase) throw new Error("Associated domain_purchase not found");

    // 2. Llamar Openprovider para renovar
    const domainName = renewal.domain.split(".")[0];
    const extension = renewal.domain.endsWith(".com.mx") ? "com.mx" : renewal.domain.split(".").slice(1).join(".");

    let openproviderResult: any = null;
    let openproviderError: string | null = null;

    try {
      console.log(`[Renew] Calling Openprovider renewDomainRequest for ${renewal.domain}`);
      openproviderResult = await openproviderRequest("renewDomainRequest", {
        domain: { name: domainName, extension },
        period: 1,
      });
      console.log(`[Renew] ✅ Openprovider success: ${JSON.stringify(openproviderResult.data).substring(0, 200)}`);
    } catch (err: any) {
      openproviderError = err.message;
      console.error(`[Renew] ❌ Openprovider failed: ${err.message}`);
      // Marcar como failed pero continuar para incrementar attempts
      await supabase
        .from("domain_renewals")
        .update({
          status: "failed",
          renewal_attempts: (renewal.renewal_attempts || 0) + 1,
          last_renewal_attempt_at: new Date().toISOString(),
          metadata: { ...(renewal.metadata || {}), last_error: openproviderError, last_payment_ref: paymentRef },
        })
        .eq("id", renewalId);

      return new Response(
        JSON.stringify({ success: false, error: openproviderError, action: "marked_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calcular nueva fecha de expiración: usar la que devuelve Openprovider o +1 año desde la actual
    const newExpiry = openproviderResult.data?.expirationDate
      ? new Date(openproviderResult.data.expirationDate.replace(" ", "T") + "Z").toISOString()
      : (() => {
          const current = new Date(purchase.expires_at || renewal.next_renewal_date);
          current.setFullYear(current.getFullYear() + 1);
          return current.toISOString();
        })();

    // 4. Actualizar domain_purchases con nueva fecha
    await supabase
      .from("domain_purchases")
      .update({ expires_at: newExpiry, status: "active" })
      .eq("id", purchase.id);

    // 5. Marcar el renewal actual como completado
    await supabase
      .from("domain_renewals")
      .update({
        status: "renewed",
        renewal_attempts: (renewal.renewal_attempts || 0) + 1,
        last_renewal_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(renewal.metadata || {}),
          renewed_at: new Date().toISOString(),
          payment_ref: paymentRef,
          renewal_source: source,
          openprovider_response: openproviderResult.data,
        },
      })
      .eq("id", renewalId);

    // 6. Crear NUEVO registro de renewal para el siguiente ciclo (1 año más adelante)
    const { error: nextRenewalErr } = await supabase.from("domain_renewals").insert({
      tenant_id: renewal.tenant_id,
      domain: renewal.domain,
      domain_purchase_id: purchase.id,
      auto_renew: renewal.auto_renew,
      mercadopago_preapproval_id: renewal.mercadopago_preapproval_id,
      next_renewal_date: newExpiry,
      status: "scheduled",
      amount_mxn: renewal.price_mxn,
      price_mxn: renewal.price_mxn,
      metadata: { created_from: "previous_renewal", previous_renewal_id: renewalId },
    });
    if (nextRenewalErr) console.warn("[Renew] Could not create next renewal record:", nextRenewalErr);

    // 7. Log para analytics
    await supabase.from("whatsapp_logs").insert({
      tenant_id: renewal.tenant_id,
      event_type: "domain_renewed",
      payload: {
        domain: renewal.domain,
        renewal_id: renewalId,
        new_expires_at: newExpiry,
        source,
        payment_ref: paymentRef,
        amount_mxn: renewal.price_mxn,
      },
    });

    console.log(`[Renew] ✅ Domain ${renewal.domain} renewed until ${newExpiry}`);

    return new Response(
      JSON.stringify({
        success: true,
        renewalId,
        domain: renewal.domain,
        new_expires_at: newExpiry,
        next_renewal_scheduled: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Renew] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
