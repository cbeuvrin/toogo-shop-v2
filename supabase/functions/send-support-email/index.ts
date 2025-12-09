import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  tenantName?: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, tenantName, phone }: SupportEmailRequest = await req.json();

    console.log("Processing support email:", { name, email, subject, hasTenant: !!tenantName });

    // Send email to support
    const supportEmail = await resend.emails.send({
      from: "TOOGO Soporte <soporte@toogo.store>",
      to: ["soporte@toogo.store"],
      replyTo: email,
      subject: `[Soporte] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #0EA5E9; padding-bottom: 10px;">
            Nuevo mensaje de soporte
          </h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Nombre:</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin: 5px 0;"><strong>Teléfono:</strong> ${phone}</p>` : ''}
            ${tenantName ? `<p style="margin: 5px 0;"><strong>Tienda:</strong> ${tenantName}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Asunto:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #0EA5E9; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Mensaje:</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
            <p>Este mensaje fue enviado desde el formulario de contacto de TOOGO</p>
            <p>Puedes responder directamente a este email para contactar al usuario</p>
          </div>
        </div>
      `,
    });

    console.log("Support email sent:", supportEmail);

    // Send confirmation to user
    const confirmationEmail = await resend.emails.send({
      from: "TOOGO Soporte <soporte@toogo.store>",
      to: [email],
      subject: "Hemos recibido tu mensaje - TOOGO Soporte",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">¡Gracias por contactarnos!</h1>
          </div>
          
          <div style="background-color: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hola <strong>${name}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Hemos recibido tu mensaje y nuestro equipo de soporte lo revisará a la brevedad. 
              Normalmente respondemos en un plazo de 24 horas hábiles.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Resumen de tu mensaje
              </h3>
              <p style="margin: 8px 0; color: #666;"><strong>Asunto:</strong> ${subject}</p>
              <p style="margin: 8px 0; color: #666; white-space: pre-wrap;">${message}</p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px;">
              <p style="margin: 0; color: #0369a1; font-size: 14px;">
                💡 <strong>Consejo:</strong> Mientras esperás nuestra respuesta, podés consultar nuestra 
                <a href="https://toogo.store/ayuda" style="color: #0EA5E9; text-decoration: none;">sección de ayuda</a> 
                donde encontrarás respuestas a las preguntas más frecuentes.
              </p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #999; font-size: 13px; margin: 5px 0;">
                Equipo de TOOGO
              </p>
              <p style="color: #999; font-size: 13px; margin: 5px 0;">
                soporte@toogo.store
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Confirmation email sent:", confirmationEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado correctamente" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
