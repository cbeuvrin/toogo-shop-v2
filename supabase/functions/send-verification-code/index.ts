import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
}

const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: VerificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 6-digit verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    console.log(`Generating verification code for ${email}: ${code}`);

    // Clean up expired codes first
    await supabase
      .from('verification_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Store verification code in database
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save verification code');
    }

    // Send email with verification code
    const emailResponse = await resend.emails.send({
      from: "Toogo Store <hola@mail.toogo.store>",
      to: [email],
      subject: "Tu código de verificación - Toogo Store",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de Verificación</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
          <!-- Preheader (invisible text for email preview) -->
          <div style="display: none; max-height: 0px; overflow: hidden;">
            Tu código de verificación para Toogo Store. No compartas este código con nadie.
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header - Logo Toogo (sin fondo morado) -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff; border-bottom: 2px solid #f1f5f9; border-radius: 12px 12px 0 0;">
                      <img src="cid:toogo-logo" alt="Toogo Store" style="height: 50px; width: auto; margin: 0;">
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 24px; color: #1a202c; font-size: 24px; font-weight: 600; text-align: center;">
                        🔒 Verifica tu cuenta
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Hola,
                      </p>
                      
                      <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Recibimos una solicitud para verificar tu correo en <strong>Toogo Store</strong>. 
                        Para completar tu registro, ingresa el siguiente código de verificación:
                      </p>
                      
                      <!-- Verification Code con Muñeco al lado -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 32px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <!-- Muñeco (izquierda) -->
                                <td style="padding-right: 24px; vertical-align: middle;">
                                  <img src="cid:toogo-mascot" alt="Mascota Toogo" style="width: 80px; height: auto; display: block;">
                                </td>
                                <!-- Código (derecha) -->
                                <td style="vertical-align: middle;">
                                  <div style="background-color: #f7fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px 32px; display: inline-block;">
                                    <div style="font-size: 32px; font-weight: 700; color: #2d3748; letter-spacing: 6px; font-family: 'Monaco', 'Menlo', monospace;">
                                      ${code}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 32px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                        Este código expira en <strong>10 minutos</strong>.<br>
                        <br>
                        Si no solicitaste esta verificación, puedes ignorar este correo de forma segura.
                      </p>
                      
                      <p style="margin: 24px 0 0; color: #718096; font-size: 12px; line-height: 1.6; text-align: center;">
                        <strong>Importante:</strong> Nunca compartas este código con nadie. Toogo Store nunca te pedirá este código por teléfono o correo.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 12px; color: #a0aec0; font-size: 12px;">
                        © 2024 Toogo Store - Creando tiendas increíbles para emprendedores
                      </p>
                      <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                        <a href="https://toogo.store" style="color: #9333ea; text-decoration: none;">Visitar Toogo Store</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          path: "https://toogo.store/assets/toogo-logo-email.png",
          filename: "toogo-logo-email.png",
          content_id: "toogo-logo"
        },
        {
          path: "https://toogo.store/assets/toogo-mascot-email.png",
          filename: "toogo-mascot-email.png",
          content_id: "toogo-mascot"
        }
      ]
    });

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error('Failed to send verification email');
    }

    console.log(`Verification code sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código de verificación enviado",
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-verification-code function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error interno del servidor",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);