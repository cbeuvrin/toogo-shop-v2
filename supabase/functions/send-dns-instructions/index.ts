import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, domain, tenant_id, tenant_name } = await req.json();
    
    console.log(`[DNS Instructions] Enviando a ${email} para ${domain}`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Construir HTML del email con instrucciones DNS
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8246C0; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .dns-record { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #8246C0; }
          .code { font-family: monospace; background: #eee; padding: 2px 6px; border-radius: 3px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .step { margin: 20px 0; padding: 15px; background: white; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Tu tienda está casi lista!</h1>
            <p>Configura tu dominio: <strong>${domain}</strong></p>
          </div>
          
          <div class="content">
            <h2>📋 Instrucciones de configuración DNS</h2>
            <p>Para conectar <strong>${domain}</strong> con tu tienda Toogo, necesitas agregar estos registros DNS en tu proveedor actual (GoDaddy, Namecheap, etc.):</p>
            
            <div class="dns-record">
              <h3>📍 Registro A (dominio raíz)</h3>
              <p><strong>Tipo:</strong> <span class="code">A</span></p>
              <p><strong>Nombre:</strong> <span class="code">@</span></p>
              <p><strong>Valor:</strong> <span class="code">76.76.21.21</span></p>
              <p><strong>TTL:</strong> <span class="code">3600</span> (o automático)</p>
            </div>
            
            <div class="dns-record">
              <h3>📍 Registro CNAME (www)</h3>
              <p><strong>Tipo:</strong> <span class="code">CNAME</span></p>
              <p><strong>Nombre:</strong> <span class="code">www</span></p>
              <p><strong>Valor:</strong> <span class="code">cname.vercel-dns.com</span></p>
              <p><strong>TTL:</strong> <span class="code">3600</span> (o automático)</p>
            </div>
            
            <div class="warning">
              ⏱️ <strong>Tiempo de propagación:</strong> Los cambios DNS pueden tardar de 24 a 48 horas en propagarse completamente.
            </div>
            
            <h2>🔧 Pasos según tu proveedor:</h2>
            
            <div class="step">
              <h3>GoDaddy:</h3>
              <ol>
                <li>Ingresa a tu cuenta de GoDaddy</li>
                <li>Ve a "Mis productos" → "Dominios"</li>
                <li>Click en tu dominio → "Administrar DNS"</li>
                <li>Agrega los registros A y CNAME como se indica arriba</li>
              </ol>
            </div>
            
            <div class="step">
              <h3>Namecheap:</h3>
              <ol>
                <li>Ingresa a tu cuenta de Namecheap</li>
                <li>Ve a "Domain List"</li>
                <li>Click en "Manage" junto a tu dominio</li>
                <li>Ve a "Advanced DNS"</li>
                <li>Agrega los registros A y CNAME</li>
              </ol>
            </div>
            
            <div class="step">
              <h3>Otros proveedores:</h3>
              <p>Busca la sección "DNS Management" o "DNS Settings" en tu proveedor y agrega los registros especificados.</p>
            </div>
            
            <div class="warning">
              💡 <strong>Tip:</strong> Si tienes registros A o CNAME anteriores para este dominio, reemplázalos con los nuevos valores.
            </div>
            
            <h2>✅ Verificación</h2>
            <p>Una vez que configures los registros DNS, puedes verificar la propagación en: <a href="https://dnschecker.org">https://dnschecker.org</a></p>
            <p>Cuando veas que los registros apuntan correctamente, tu tienda estará accesible en <strong>${domain}</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              ¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@toogo.store">soporte@toogo.store</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email usando Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Toogo <noreply@toogo.store>',
        to: [email],
        subject: `🎉 Configura tu dominio ${domain} - Instrucciones DNS`,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Error al enviar email: ${emailResponse.statusText}`);
    }

    const emailData = await emailResponse.json();
    console.log(`[DNS Instructions] Email enviado con ID: ${emailData.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Instrucciones DNS enviadas',
        email_id: emailData.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DNS Instructions] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
