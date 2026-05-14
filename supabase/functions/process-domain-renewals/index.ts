/**
 * process-domain-renewals
 *
 * Cron diario que decide qué hacer con cada dominio según su fecha de vencimiento:
 * - 30/7/1 días antes → enviar email recordatorio
 * - +1 día (recién vencido) → email "grace period iniciado"
 * - +30 días (final del grace) → marcar como expired
 * - Si auto_renew=true y preapproval activo → intentar cobro automático (Fase 4)
 *
 * Diseñado para correr 1x/día. Es idempotente: si un recordatorio ya se envió,
 * no se reenvía (se trackea en domain_renewals.reminders_sent).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Renewal {
  id: string;
  domain: string;
  next_renewal_date: string;
  status: string;
  auto_renew: boolean;
  mercadopago_preapproval_id: string | null;
  reminders_sent: string[] | null;
  tenant_id: string;
}

function daysBetween(future: Date, now: Date): number {
  const diff = future.getTime() - now.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  console.log(`[Renewals] Starting daily scan at ${now.toISOString()}`);

  // Solo procesamos renewals que aún están activas (no canceladas/renovadas/expiradas)
  const { data: renewals, error } = await supabase
    .from("domain_renewals")
    .select("id, domain, next_renewal_date, status, auto_renew, mercadopago_preapproval_id, reminders_sent, tenant_id")
    .in("status", ["scheduled", "reminded"]);

  if (error) {
    console.error("[Renewals] Error fetching renewals:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[Renewals] Found ${renewals?.length || 0} active renewals to evaluate`);

  const actions: Array<{ domain: string; action: string; result: any }> = [];

  for (const renewal of (renewals || []) as Renewal[]) {
    const expiresAt = new Date(renewal.next_renewal_date);
    const daysLeft = daysBetween(expiresAt, now);

    console.log(`[Renewals] ${renewal.domain}: ${daysLeft} días restantes (status=${renewal.status}, auto=${renewal.auto_renew})`);

    // ─────────────────────────────────────────────
    // CASO 1: Auto-renovación habilitada y faltan ≤ 7 días → intentar cobro
    // (Fase 4 — por ahora solo logueamos, no cobramos todavía)
    // ─────────────────────────────────────────────
    if (renewal.auto_renew && renewal.mercadopago_preapproval_id && daysLeft <= 7 && daysLeft >= 0) {
      console.log(`[Renewals] ${renewal.domain}: AUTO-RENEW elegible — pendiente implementar cobro (Fase 4)`);
      actions.push({
        domain: renewal.domain,
        action: "auto_renew_pending_phase4",
        result: { daysLeft, preapprovalId: renewal.mercadopago_preapproval_id },
      });
      continue;
    }

    // ─────────────────────────────────────────────
    // CASO 2: Dominio venció hace +30 días → marcar como expired
    // (Openprovider ya lo liberó del grace period a este punto)
    // ─────────────────────────────────────────────
    if (daysLeft <= -30) {
      await supabase
        .from("domain_renewals")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("id", renewal.id);
      // También marcar el domain_purchase como expirado
      await supabase
        .from("domain_purchases")
        .update({ status: "expired" })
        .eq("domain", renewal.domain)
        .eq("tenant_id", renewal.tenant_id);

      actions.push({ domain: renewal.domain, action: "marked_expired", result: { daysLeft } });
      continue;
    }

    // ─────────────────────────────────────────────
    // CASO 3: Ventana de recordatorio — invocar send-renewal-reminder
    // El send-renewal-reminder es idempotente (no reenvía si ya se mandó)
    // ─────────────────────────────────────────────
    const inReminderWindow =
      (daysLeft >= 28 && daysLeft <= 31) ||  // ~30 días
      (daysLeft >= 6 && daysLeft <= 8) ||    // ~7 días
      (daysLeft >= 0 && daysLeft <= 2) ||    // ~1 día
      (daysLeft <= -1 && daysLeft >= -2) ||  // recién vencido (grace period start)
      (daysLeft <= -28 && daysLeft >= -29);  // final del grace

    if (inReminderWindow) {
      try {
        const { data: reminderResult, error: reminderError } = await supabase.functions.invoke(
          "send-renewal-reminder",
          { body: { renewalId: renewal.id, daysUntilExpiry: daysLeft } }
        );
        actions.push({
          domain: renewal.domain,
          action: "send_reminder",
          result: reminderError ? { error: reminderError.message } : reminderResult,
        });
      } catch (err: any) {
        console.error(`[Renewals] Error sending reminder for ${renewal.domain}:`, err);
        actions.push({ domain: renewal.domain, action: "send_reminder", result: { error: err.message } });
      }
      continue;
    }

    // ─────────────────────────────────────────────
    // CASO 4: Fuera de ventanas → nada que hacer hoy
    // ─────────────────────────────────────────────
    actions.push({ domain: renewal.domain, action: "no_action", result: { daysLeft } });
  }

  console.log(`[Renewals] Completed scan. Processed ${actions.length} renewals.`);

  return new Response(
    JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      processed: actions.length,
      actions,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
