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

  // Auth interna: solo el webhook (que conoce el secreto) puede invocar esta función.
  // Sin esto, cualquiera con la URL podía dispararla y provocar el SSRF de abajo.
  const INTERNAL_SECRET = Deno.env.get('INTERNAL_WEBHOOK_SECRET');
  if (!INTERNAL_SECRET || req.headers.get('x-internal-secret') !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { audioUrl, tenantId } = await req.json();

    if (!audioUrl) {
      throw new Error('audioUrl is required');
    }

    // Anti-SSRF: solo descargamos de Twilio. Las credenciales de Twilio se adjuntan
    // al fetch de abajo; sin este candado, un audioUrl arbitrario las filtraba a un
    // servidor atacante. Aceptamos únicamente https en *.twilio.com / api.twilio.com.
    try {
      const parsed = new URL(audioUrl);
      const audioHost = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:' || (audioHost !== 'api.twilio.com' && !audioHost.endsWith('.twilio.com'))) {
        throw new Error('host not allowed');
      }
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'audioUrl must be an https Twilio URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio credentials para autenticar descarga — las media URLs de Twilio
    // requieren Account SID + Auth Token (las API Keys NO sirven para media).
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    console.log('🎤 Starting audio transcription from Twilio URL:', audioUrl);

    // Descargar audio de Twilio (requiere autenticación Basic)
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const audioResponse = await fetch(audioUrl, {
      headers: { 'Authorization': authHeader }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio from Twilio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('📥 Audio downloaded, size:', audioBlob.size);

    // Transcribir con OpenAI Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');

    const transcriptionResponse = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`
        },
        body: formData
      }
    );

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error('Whisper API error:', error);
      throw new Error(`Whisper transcription failed: ${error}`);
    }

    const transcription = await transcriptionResponse.json();
    const transcribedText = transcription.text;

    console.log('✅ Transcription complete:', transcribedText.substring(0, 100) + '...');

    // Log del evento
    await supabase.from('whatsapp_logs').insert({
      tenant_id: tenantId,
      event_type: 'audio_transcribed',
      payload: {
        audioUrl,
        textLength: transcribedText.length,
        preview: transcribedText.substring(0, 100)
      }
    });

    return new Response(
      JSON.stringify({
        text: transcribedText,
        audioUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
