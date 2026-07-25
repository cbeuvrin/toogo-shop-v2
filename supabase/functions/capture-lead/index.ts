import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A dónde llega la notificación de nuevo lead (cambiable por secret)
const NOTIFY_TO = Deno.env.get('LEADS_NOTIFY_EMAIL') || 'soporte@toogo.store';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Nunca bloqueamos la UX del usuario: cualquier fallo → success:true igual.
  try {
    const { email, source, metadata } = await req.json().catch(() => ({}));

    if (!email || typeof email !== 'string' || !isEmail(email.trim())) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Guardar el lead
    const { error: insertError } = await supabase.from('leads').insert({
      email: cleanEmail,
      source: (source || 'landing').toString().slice(0, 80),
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
    if (insertError) console.error('lead insert error:', insertError);

    // 2) Notificar por correo (best-effort)
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TOOGO Leads <soporte@toogo.store>',
            to: [NOTIFY_TO],
            reply_to: cleanEmail,
            subject: `Nuevo lead en toogo.store: ${cleanEmail}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
                <h2 style="color:#7C3AED;margin:0 0 4px">Nuevo lead 🎉</h2>
                <p style="color:#52525b;margin:0 0 20px">Alguien dejó su correo en la landing.</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px 0;color:#52525b">Correo</td><td style="padding:8px 0;font-weight:700"><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
                  <tr><td style="padding:8px 0;color:#52525b">Origen</td><td style="padding:8px 0">${(source || 'landing')}</td></tr>
                </table>
                <p style="color:#a1a1aa;font-size:12px;margin-top:24px">Responde a este correo para escribirle directo.</p>
              </div>`,
          }),
        });
      } catch (mailErr) {
        console.error('resend notify error:', mailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('capture-lead error:', error);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
