import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, tenantId } = await req.json();

    if (!phoneNumber || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[whatsapp-send-verification] Sending verification to:', phoneNumber);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('[whatsapp-send-verification] Generated code:', verificationCode);

    // Update whatsapp_users with verification code
    const { error: updateError } = await supabase
      .from('whatsapp_users')
      .update({
        verification_code: verificationCode,
        verification_expires_at: expiresAt.toISOString(),
        is_verified: false,
      })
      .eq('phone_number', phoneNumber)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[whatsapp-send-verification] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send WhatsApp message via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error('[whatsapp-send-verification] Twilio credentials missing');
      return new Response(
        JSON.stringify({ error: 'WhatsApp service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Twilio (must be whatsapp:+...)
    const formattedTo = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const toNumber = `whatsapp:${formattedTo}`;
    const fromNumber = twilioWhatsAppNumber.startsWith('whatsapp:') 
      ? twilioWhatsAppNumber 
      : `whatsapp:${twilioWhatsAppNumber}`;

    const message = `🔐 *Código de Verificación Toogo*\n\nTu código es: *${verificationCode}*\n\nEste código expira en 10 minutos.\n\n_Si no solicitaste este código, ignora este mensaje._`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromNumber);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('[whatsapp-send-verification] Twilio error:', twilioResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: twilioResult.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[whatsapp-send-verification] Message sent successfully:', twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent',
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-send-verification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
