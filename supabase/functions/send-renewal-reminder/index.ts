import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  renewalId: string;     // ID de la fila en domain_renewals
  daysUntilExpiry: number; // 30, 7, 1, -1, -30
}

type ReminderType = "30d" | "7d" | "1d" | "expired_grace" | "expired_final";

function classifyReminder(daysLeft: number): ReminderType | null {
  if (daysLeft >= 28 && daysLeft <= 31) return "30d";
  if (daysLeft >= 6 && daysLeft <= 8) return "7d";
  if (daysLeft >= 0 && daysLeft <= 2) return "1d";
  if (daysLeft < 0 && daysLeft >= -2) return "expired_grace";
  if (daysLeft < 0 && daysLeft <= -28) return "expired_final";
  return null;
}

// Genera la versión texto plano del email (requerido por Gmail/iCloud para deliverability)
function buildPlainText(type: ReminderType, domain: string, daysLeft: number, priceMxn: number, renewalLink: string): string {
  const expiryLabel = daysLeft >= 0
    ? `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
    : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`;

  const introByType: Record<ReminderType, string> = {
    "30d": "Tu dominio vence en un mes. Te recomendamos renovarlo cuanto antes para asegurar la continuidad de tu tienda.",
    "7d": "Tu dominio vence en una semana. Renuévalo hoy para evitar interrupciones.",
    "1d": "Tu dominio vence mañana. Si no renuevas hoy, tu tienda podría dejar de estar accesible.",
    expired_grace: "Tu dominio expiró pero aún tienes 29 días de gracia para recuperarlo.",
    expired_final: "Última oportunidad. Tu período de gracia termina en 1 día.",
  };

  return `Hola,

${introByType[type]}

Dominio: ${domain}
${expiryLabel}

Costo de renovación por 1 año: $${priceMxn} MXN

Renovar ahora: ${renewalLink}

---
¿Quieres olvidarte de las renovaciones? Activa la renovación automática desde tu dashboard.

Toogo Store
https://www.toogo.store
soporte@toogo.store`;
}

function buildEmailContent(type: ReminderType, domain: string, daysLeft: number, priceMxn: number, renewalLink: string) {
  // Subjects sobrios (sin emojis dramáticos que disparen filtros de spam).
  // Solo un emoji sutil tipo el del email de verificación.
  const config: Record<ReminderType, { subject: string; heading: string; intro: string; accentColor: string; ctaLabel: string }> = {
    "30d": {
      subject: `Tu dominio ${domain} vence en 30 días`,
      heading: "🔔 Tu dominio vence pronto",
      intro: "Falta un mes para que tu dominio expire. Te recomendamos renovarlo cuanto antes para asegurar la continuidad de tu tienda.",
      accentColor: "#9333ea",
      ctaLabel: "Renovar ahora",
    },
    "7d": {
      subject: `Renueva ${domain} antes del vencimiento`,
      heading: "🔔 Solo quedan 7 días",
      intro: "Tu dominio vence en una semana. Renuévalo hoy para evitar interrupciones en tu tienda.",
      accentColor: "#9333ea",
      ctaLabel: "Renovar ahora",
    },
    "1d": {
      subject: `Último día para renovar ${domain}`,
      heading: "🔔 Tu dominio vence mañana",
      intro: "Si no renuevas hoy, tu tienda podría dejar de estar accesible. Renueva en menos de 1 minuto.",
      accentColor: "#9333ea",
      ctaLabel: "Renovar ahora",
    },
    expired_grace: {
      subject: `${domain} venció — Aún puedes recuperarlo`,
      heading: "🔔 Tu dominio venció",
      intro: "Tu dominio expiró pero todavía tienes 29 días de gracia para recuperarlo antes que se libere al público.",
      accentColor: "#9333ea",
      ctaLabel: "Recuperar dominio",
    },
    expired_final: {
      subject: `Última oportunidad para recuperar ${domain}`,
      heading: "🔔 Última oportunidad",
      intro: "Tu período de gracia termina en 1 día. Si no actúas ahora, tu dominio quedará disponible para cualquier persona.",
      accentColor: "#9333ea",
      ctaLabel: "Recuperar ahora",
    },
  };

  const c = config[type];
  const expiryLabel = daysLeft >= 0
    ? `Vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`
    : `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${c.intro} Renueva tu dominio en Toogo Store.
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header: Logo Toogo -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff; border-bottom: 2px solid #f1f5f9; border-radius: 12px 12px 0 0;">
              <img src="cid:toogo-logo" alt="Toogo Store" style="height: 50px; width: auto; margin: 0;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px; color: #1a202c; font-size: 24px; font-weight: 600; text-align: center;">
                ${c.heading}
              </h2>

              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Hola,
              </p>

              <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                ${c.intro}
              </p>

              <!-- Caja con dominio + mascota -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 16px 0 32px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right: 24px; vertical-align: middle;">
                          <img src="cid:toogo-mascot" alt="Mascota Toogo" style="width: 80px; height: auto; display: block;">
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="background-color: #f7fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px 24px; display: inline-block; text-align: left;">
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748; font-family: 'Monaco', 'Menlo', monospace; word-break: break-all;">
                              ${domain}
                            </div>
                            <div style="font-size: 13px; color: #718096; margin-top: 6px;">
                              ${expiryLabel}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Costo y CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <p style="margin: 0 0 8px; color: #718096; font-size: 14px;">
                      Costo de renovación por 1 año:
                    </p>
                    <p style="margin: 0 0 24px; color: #2d3748; font-size: 32px; font-weight: 700;">
                      $${priceMxn} <span style="font-size: 18px; color: #718096; font-weight: 500;">MXN</span>
                    </p>
                    <a href="${renewalLink}" style="display: inline-block; background-color: ${c.accentColor}; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ${c.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                ¿Quieres olvidarte de las renovaciones?<br>
                Activa la <strong>renovación automática</strong> en tu dashboard y nunca más te preocupes por perder tu dominio.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Toogo Store · Creando tiendas increíbles para emprendedores
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                <a href="https://www.toogo.store" style="color: #9333ea; text-decoration: none;">Visitar Toogo Store</a>
                &nbsp;·&nbsp;
                <a href="mailto:soporte@toogo.store" style="color: #9333ea; text-decoration: none;">Soporte</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renewalId, daysUntilExpiry } = (await req.json()) as ReminderRequest;
    if (!renewalId) throw new Error("renewalId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cargar el renewal con info del tenant y owner
    const { data: renewal, error: renewalErr } = await supabase
      .from("domain_renewals")
      .select("id, domain, price_mxn, next_renewal_date, status, reminders_sent, tenant_id, metadata")
      .eq("id", renewalId)
      .single();
    if (renewalErr || !renewal) throw new Error(`Renewal not found: ${renewalErr?.message}`);

    const reminderType = classifyReminder(daysUntilExpiry);
    if (!reminderType) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `No reminder type for daysLeft=${daysUntilExpiry}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No reenviar el mismo recordatorio si ya se envió
    const alreadySent: string[] = renewal.reminders_sent || [];
    if (alreadySent.includes(reminderType)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Reminder ${reminderType} already sent` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener email del owner del tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("owner_user_id, name, primary_host")
      .eq("id", renewal.tenant_id)
      .single();

    if (!tenant?.owner_user_id) throw new Error("Tenant or owner not found");

    const { data: userData } = await supabase.auth.admin.getUserById(tenant.owner_user_id);
    const email = userData?.user?.email;
    if (!email) throw new Error("Owner email not found");

    // Construir contenido del email
    const renewalLink = `https://www.toogo.store/dashboard?tab=mis-dominios&renew=${encodeURIComponent(renewal.domain)}`;
    const unsubscribeLink = `https://www.toogo.store/dashboard?tab=mis-dominios&unsubscribe_reminders=${encodeURIComponent(renewal.id)}`;
    const priceMxn = Number(renewal.price_mxn || 290);
    const { subject, html } = buildEmailContent(reminderType, renewal.domain, daysUntilExpiry, priceMxn, renewalLink);
    const text = buildPlainText(reminderType, renewal.domain, daysUntilExpiry, priceMxn, renewalLink);

    // Enviar via Resend. Usamos `hola@mail.toogo.store` que ya tiene reputación
    // verificada (el remitente de verification-code y otras notificaciones).
    // Adjuntamos logo y mascota como CID para que se incrusten en el body.
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Toogo Store <hola@mail.toogo.store>",
        to: [email],
        subject,
        html,
        text, // versión texto plano (mejora deliverability ~25%)
        // List-Unsubscribe es exigido por Gmail/iCloud para senders que mandan
        // notificaciones repetidas. Sin esto = clasificación spam casi garantizada.
        headers: {
          "List-Unsubscribe": `<${unsubscribeLink}>, <mailto:soporte@toogo.store?subject=unsubscribe-renewal-reminders>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        attachments: [
          {
            path: "https://toogo.store/assets/toogo-logo-email.png",
            filename: "toogo-logo-email.png",
            content_id: "toogo-logo",
          },
          {
            path: "https://toogo.store/assets/toogo-mascot-email.png",
            filename: "toogo-mascot-email.png",
            content_id: "toogo-mascot",
          },
        ],
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend error: ${emailRes.status} ${errBody}`);
    }

    const emailData = await emailRes.json();

    // Marcar como enviado en domain_renewals
    await supabase
      .from("domain_renewals")
      .update({
        reminders_sent: [...alreadySent, reminderType],
        status: "reminded",
        updated_at: new Date().toISOString(),
        metadata: {
          ...(renewal.metadata || {}),
          last_reminder: {
            type: reminderType,
            sent_at: new Date().toISOString(),
            email_id: emailData.id,
            sent_to: email,
          },
        },
      })
      .eq("id", renewalId);

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: email,
        reminder_type: reminderType,
        email_id: emailData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-renewal-reminder] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
