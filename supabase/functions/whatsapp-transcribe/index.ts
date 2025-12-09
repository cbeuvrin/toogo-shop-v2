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
    const { audioUrl, tenantId } = await req.json();

    if (!audioUrl) {
      throw new Error('audioUrl is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio credentials para autenticar descarga
    const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID')!;
    const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    console.log('🎤 Starting audio transcription from Twilio URL:', audioUrl);

    // Descargar audio de Twilio (requiere autenticación Basic)
    const authHeader = 'Basic ' + btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`);
    
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
