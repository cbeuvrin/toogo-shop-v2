import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  domain: string;
  email: string;
  tenantId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, email, tenantId }: NotificationRequest = await req.json();

    console.log("Sending store ready notification:", { domain, email, tenantId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar si el email ya fue enviado antes (idempotencia)
    const { data: domainCheck } = await supabase
      .from("domain_purchases")
      .select("metadata")
      .eq("domain", domain)
      .eq("tenant_id", tenantId)
      .single();

    const metadata = domainCheck?.metadata as any || {};
    if (metadata.email_sent === true) {
      console.log(`⏭️ Email already sent for ${domain} at ${metadata.email_sent_at}`);
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Email already sent",
          sentAt: metadata.email_sent_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify domain exists (with fallback for duplicates)
    const { data: domainData, error: domainError } = await supabase
      .from("domain_purchases")
      .select("*")
      .eq("domain", domain)
      .eq("tenant_id", tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (domainError || !domainData) {
      console.error("Domain not found:", domainError);
      return new Response(
        JSON.stringify({ error: "Domain not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get tenant information
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select("name, owner_user_id")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenantData) {
      console.error("Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user credentials from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      tenantData.owner_user_id
    );

    if (userError || !userData) {
      console.error("User not found:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const firstName = userData.user.user_metadata?.first_name || "Cliente";
    const dashboardUrl = `https://${domain}/dashboard`;

    // Compose email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tu tienda está lista</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://herqxhfmsstbteahhxpr.supabase.co/storage/v1/object/public/logos/toogo-logo.png" alt="Toogo Logo" style="height: 60px;">
          </div>

          <!-- Main Content -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0 0 10px 0; font-size: 32px;">🎉 ¡Tu tienda está lista!</h1>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Tu dominio ${domain} ya está completamente configurado</p>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #667eea; margin-top: 0;">Hola ${firstName},</h2>
            <p style="margin-bottom: 20px;">Tu dominio <strong>${domain}</strong> ya está completamente configurado y listo para usar.</p>

            <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #667eea;">🔐 Credenciales de Acceso</h3>
              <p style="margin: 5px 0;"><strong>Usuario:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Contraseña:</strong> La que elegiste al registrarte</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">🚀 Acceder a mi Dashboard</a>
            </div>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: #667eea; margin-top: 0;">📋 Próximos pasos recomendados:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 10px;">✓ Agrega tus productos</li>
              <li style="margin-bottom: 10px;">✓ Personaliza tu logo y colores</li>
              <li style="margin-bottom: 10px;">✓ Configura tus métodos de pago (MercadoPago, WhatsApp)</li>
              <li style="margin-bottom: 10px;">✓ ¡Comparte tu tienda con tus clientes!</li>
            </ul>
          </div>

          <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: #1976d2; margin-top: 0;">📚 Recursos útiles</h3>
            <ul style="padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 8px;"><a href="https://docs.toogo.store" style="color: #1976d2;">📖 Documentación completa</a></li>
              <li style="margin-bottom: 8px;"><a href="https://youtube.com/@toogo" style="color: #1976d2;">🎥 Video tutorial de bienvenida</a></li>
            </ul>
          </div>

          <div style="text-align: center; padding: 20px; border-top: 1px solid #e0e0e0; margin-top: 30px;">
            <p style="margin: 10px 0; color: #666;">💬 ¿Necesitas ayuda?</p>
            <p style="margin: 10px 0;"><a href="mailto:soporte@toogo.store" style="color: #667eea; text-decoration: none;">soporte@toogo.store</a></p>
            <p style="margin: 20px 0 10px 0; font-size: 18px;">¡Mucho éxito con tu nueva tienda! 🚀</p>
            <p style="margin: 0; color: #999; font-size: 14px;">El equipo de Toogo</p>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; margin-top: 20px;">
            <p style="margin: 5px 0; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} Toogo. Todos los derechos reservados.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Toogo <bienvenida@mail.toogo.store>",
      to: [email],
      subject: `✅ ¡Tu Tienda Ya Está Lista en ${domain}!`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully",
        emailId: emailResponse.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-store-ready-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
