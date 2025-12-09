import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const { to, message, responseType, tenantId, conversationId, imageUrl } = await req.json();

    if (!to || (!message && !imageUrl)) {
      throw new Error('to and (message or imageUrl) are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    console.log(`📤 Sending ${responseType || 'text'} message to:`, to);
    console.log('🔑 Using Account SID:', TWILIO_ACCOUNT_SID?.slice(0, 10) + '...');

    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Formatear números para Twilio WhatsApp
    const toNumber = to.startsWith('+') ? to : `+${to}`;
    const fromNumber = TWILIO_WHATSAPP_NUMBER.startsWith('+') ? TWILIO_WHATSAPP_NUMBER : `+${TWILIO_WHATSAPP_NUMBER}`;

    let mediaUrl: string | null = null;

    // Determinar tipo de mensaje
    const actualResponseType = imageUrl ? 'image' : responseType;

    if (actualResponseType === 'audio') {
      // Convertir texto a audio con OpenAI TTS
      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: message,
          voice: 'nova',
          response_format: 'mp3'
        })
      });

      if (!ttsResponse.ok) {
        console.error('TTS conversion failed:', await ttsResponse.text());
        throw new Error('TTS conversion failed');
      }

      const audioBlob = await ttsResponse.blob();
      console.log('🎤 Audio generated, size:', audioBlob.size);

      // Subir audio a Supabase Storage (bucket público)
      const fileName = `whatsapp-audio/${tenantId}/${Date.now()}.mp3`;
      const audioBuffer = new Uint8Array(await audioBlob.arrayBuffer());
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Audio upload failed:', uploadError);
        throw new Error('Failed to upload audio');
      }

      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      mediaUrl = publicUrlData.publicUrl;
      console.log('✅ Audio uploaded to storage:', mediaUrl);

      // Guardar mensaje de voz saliente
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        message_type: 'audio',
        content: message,
        audio_url: mediaUrl,
        processed_at: new Date().toISOString()
      });
    } else if (actualResponseType === 'image') {
      // Enviar imagen
      mediaUrl = imageUrl;
      console.log('🖼️ Sending image:', mediaUrl);

      // Guardar mensaje de imagen saliente
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        message_type: 'image',
        content: message || 'Imagen generada',
        image_url: mediaUrl,
        processed_at: new Date().toISOString()
      });
    } else {
      // Guardar mensaje de texto saliente
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        message_type: 'text',
        content: message,
        processed_at: new Date().toISOString()
      });
    }

    // Preparar form data para Twilio
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:${toNumber}`);
    
    if (mediaUrl) {
      // Enviar media (audio o imagen)
      formData.append('MediaUrl', mediaUrl);
      // Si hay mensaje de texto además de la imagen, incluirlo
      if (message && actualResponseType === 'image') {
        formData.append('Body', message);
      }
    } else {
      // Enviar texto
      formData.append('Body', message);
    }

    // Enviar mensaje via Twilio API
    const sendResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      console.error('Twilio send failed:', error);
      throw new Error(`Twilio send failed: ${error}`);
    }

    const sendData = await sendResponse.json();
    console.log('✅ Message sent successfully:', sendData.sid);

    // Log del envío
    await supabase.from('whatsapp_logs').insert({
      tenant_id: tenantId,
      event_type: 'message_sent',
      payload: {
        to: toNumber,
        type: actualResponseType || 'text',
        messageSid: sendData.sid,
        hasMedia: !!mediaUrl
      }
    });

    return new Response(
      JSON.stringify({ success: true, messageSid: sendData.sid }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Send error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
