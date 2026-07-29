import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC-SHA1 → base64 (el algoritmo que usa Twilio para X-Twilio-Signature).
async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Verifica la firma de Twilio probando varias reconstrucciones de la URL, porque
// detrás del proxy de Supabase la URL que ve la función puede no ser idéntica a la
// que Twilio firmó. En modo log-only reporta cuál coincide para poder activar el
// bloqueo (TWILIO_SIGNATURE_ENFORCE) con certeza y sin tumbar el bot.
async function twilioSignatureCheck(req: Request, formData: FormData) {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const received = req.headers.get('X-Twilio-Signature') || '';
  const params: [string, string][] = [];
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string') params.push([k, v]);
  }
  params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const suffix = params.map(([k, v]) => k + v).join('');

  const u = new URL(req.url);
  const host = req.headers.get('host') || u.host;
  const xfHost = req.headers.get('x-forwarded-host') || '';
  const xfProto = req.headers.get('x-forwarded-proto') || 'https';
  const supaBase = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const candidates: Record<string, string> = {
    envUrl: Deno.env.get('TWILIO_WEBHOOK_URL') || '',
    reqUrl: req.url,
    httpsHost: `https://${host}${u.pathname}${u.search}`,
    canonical: supaBase ? `${supaBase}/functions/v1/whatsapp-webhook` : '',
    fwdHost: xfHost ? `${xfProto}://${xfHost}${u.pathname}${u.search}` : '',
  };

  const results: Record<string, boolean | 'skip'> = {};
  let anyValid = false;
  let matchedKey = '';
  for (const [name, url] of Object.entries(candidates)) {
    if (!url) { results[name] = 'skip'; continue; }
    const computed = await hmacSha1Base64(authToken, url + suffix);
    const ok = received.length > 0 && computed === received;
    results[name] = ok;
    if (ok && !anyValid) { anyValid = true; matchedKey = name; }
  }
  // Diagnóstico (solo para afinar la URL; no expone el auth token):
  const diag = { reqUrl: req.url, host, xfHost, xfProto, pathname: u.pathname, search: u.search, receivedPrefix: received.slice(0, 8), paramKeys: params.map(([k]) => k).join(',') };
  return { anyValid, matchedKey, results, hasSignature: received.length > 0, diag };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST - Recibir mensajes de WhatsApp via Twilio
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio envía form-data, no JSON
    const formData = await req.formData();

    // Validación de firma de Twilio (anti-suplantación). Arranca en modo LOG-ONLY:
    // registra si la firma coincide y con qué reconstrucción de URL, sin bloquear.
    // Cuando confirmemos en logs que coincide con un WhatsApp real, se pone el secret
    // TWILIO_SIGNATURE_ENFORCE=true y a partir de ahí rechaza las peticiones falsas.
    const enforce = Deno.env.get('TWILIO_SIGNATURE_ENFORCE') === 'true';
    const sig = await twilioSignatureCheck(req, formData);
    console.log('🔐 Twilio signature:', JSON.stringify({ enforce, valid: sig.anyValid, matched: sig.matchedKey, hasSignature: sig.hasSignature, results: sig.results }));
    // Dejamos rastro en whatsapp_logs (legible por SQL) para confirmar qué reconstrucción
    // de URL coincide con el tráfico real de Twilio antes de activar el enforce.
    try {
      await supabase.from('whatsapp_logs').insert({
        event_type: 'twilio_sig_check',
        payload: { enforce, valid: sig.anyValid, matched: sig.matchedKey, hasSignature: sig.hasSignature, results: sig.results, diag: sig.diag },
      });
    } catch (_e) { /* best-effort */ }
    if (enforce && !sig.anyValid) {
      console.warn('❌ Firma de Twilio inválida — petición rechazada (enforce ON)');
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Extraer campos de Twilio
    const from = formData.get('From')?.toString().replace('whatsapp:', '') || '';
    const body = formData.get('Body')?.toString() || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0', 10);
    const mediaUrl0 = formData.get('MediaUrl0')?.toString();
    const mediaContentType0 = formData.get('MediaContentType0')?.toString();
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log('📨 Twilio Webhook received:', { from, body, numMedia, mediaUrl0, messageSid });

    if (!from) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // Determinar tipo de mensaje
    let messageType: 'text' | 'audio' | 'image' = 'text';
    if (numMedia > 0 && mediaContentType0) {
      if (mediaContentType0.startsWith('audio/')) {
        messageType = 'audio';
      } else if (mediaContentType0.startsWith('image/')) {
        messageType = 'image';
      }
    }

    // Normalizar número de teléfono para México
    // Twilio envía +521XXXXXXXXXX pero almacenamos +52XXXXXXXXXX
    function normalizePhoneNumber(phone: string): string {
      let normalized = phone.replace(/\s+/g, '');

      // Para números mexicanos: +521XXXXXXXXXX → +52XXXXXXXXXX
      // El "1" después de +52 es código de larga distancia nacional que Twilio agrega
      if (normalized.startsWith('+521') && normalized.length === 14) {
        normalized = '+52' + normalized.slice(4);
      }

      return normalized;
    }

    // Buscar por los últimos 10 dígitos (número nacional). Así da igual cómo venga
    // formateado el número (con/sin código de país, con el "1" extra que Twilio
    // agrega en México, etc.) vs cómo se guardó al registrarse.
    const last10 = from.replace(/\D/g, '').slice(-10);

    console.log('🔍 Searching for user by last-10 digits:', last10, '(original:', from, ')');

    const { data: whatsappUser, error: userError } = await supabase
      .from('whatsapp_users')
      .select('*, tenants(*)')
      .ilike('phone_number', `%${last10}%`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (userError || !whatsappUser) {
      await supabase.from('whatsapp_logs').insert({
        event_type: 'unknown_user',
        payload: { from, body, messageSid },
        error: 'User not found or inactive'
      });

      // Twilio espera respuesta TwiML
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    const tenantId = whatsappUser.tenant_id;

    // Timeout de conversación por inactividad (10 minutos)
    const CONVERSATION_TIMEOUT_MINUTES = 10;

    // Buscar o crear conversación
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('whatsapp_user_id', whatsappUser.id)
      .eq('customer_phone', from)
      .eq('status', 'active')
      .single();

    // Si hay conversación activa pero pasaron más de 10 minutos, eliminarla y empezar de nuevo
    if (conversation && conversation.last_message_at) {
      const lastMessageAt = new Date(conversation.last_message_at);
      const now = new Date();
      const minutesSinceLastMessage = (now.getTime() - lastMessageAt.getTime()) / (1000 * 60);

      if (minutesSinceLastMessage > CONVERSATION_TIMEOUT_MINUTES) {
        console.log(`⏰ Conversation timeout after ${minutesSinceLastMessage.toFixed(1)} minutes. Deleting old and starting fresh.`);

        // Eliminar conversación antigua (los mensajes tienen ON DELETE CASCADE o se mantienen como histórico)
        const { error: deleteError } = await supabase
          .from('whatsapp_conversations')
          .delete()
          .eq('id', conversation.id);

        if (deleteError) {
          console.error('❌ Error deleting conversation:', deleteError);
          // Si falla eliminar, usar la existente y solo actualizar timestamp
          await supabase
            .from('whatsapp_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation.id);
          console.log('⚠️ Reusing existing conversation due to delete error');
        } else {
          console.log('✅ Old conversation deleted successfully');
          conversation = null;
        }
      }
    }

    if (!conversation) {
      console.log('🆕 Creating new conversation...');
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          whatsapp_user_id: whatsappUser.id,
          tenant_id: tenantId,
          customer_phone: from,
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating conversation:', createError);
        throw createError;
      }
      console.log('✅ New conversation created:', newConv.id);
      conversation = newConv;
    } else {
      // Actualizar last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    let messageContent = body;
    let audioUrl = null;
    let imageUrl = null;

    // Procesar según tipo de mensaje
    if (messageType === 'audio' && mediaUrl0) {
      // Llamar a whatsapp-transcribe con la URL directa de Twilio
      const { data: transcription, error: transcribeError } = await supabase.functions.invoke(
        'whatsapp-transcribe',
        {
          body: { audioUrl: mediaUrl0, tenantId },
          headers: { 'x-internal-secret': Deno.env.get('INTERNAL_WEBHOOK_SECRET') || '' }
        }
      );

      if (transcribeError || !transcription?.text) {
        console.error('Transcription failed:', transcribeError);
        messageContent = '[Audio no transcrito]';
      } else {
        messageContent = transcription.text;
        audioUrl = mediaUrl0;
      }
    } else if (messageType === 'image' && mediaUrl0) {
      console.log('📷 Processing image from Twilio:', mediaUrl0);

      // IMPORTANTE: Twilio media URLs requieren Account SID + Auth Token (NO API Keys)
      const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
      const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        console.error('❌ Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
      } else {
        const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        try {
          const imageResponse = await fetch(mediaUrl0, {
            headers: { 'Authorization': authHeader }
          });

          console.log('📷 Image download status:', imageResponse.status);

          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = new Uint8Array(arrayBuffer);

            console.log('📷 Image size:', imageBuffer.length, 'bytes');

            // Subir a Supabase Storage
            const fileName = `whatsapp/${tenantId}/${Date.now()}-${messageSid}.jpg`;
            const { error: uploadError } = await supabase.storage
              .from('logos')
              .upload(fileName, imageBuffer, {
                contentType: mediaContentType0 || 'image/jpeg',
                upsert: false
              });

            if (uploadError) {
              console.error('❌ Image upload error:', uploadError);
            } else {
              const { data: publicUrlData } = supabase.storage
                .from('logos')
                .getPublicUrl(fileName);

              imageUrl = publicUrlData.publicUrl;
              console.log('✅ Image saved successfully:', imageUrl);
            }
          } else {
            const errorText = await imageResponse.text();
            console.error('❌ Image download failed:', imageResponse.status, errorText);
          }
        } catch (downloadError) {
          console.error('❌ Image processing error:', downloadError);
        }
      }

      messageContent = body || '[Imagen recibida]';
    }

    // Guardar mensaje entrante
    const { data: insertedMessage, error: insertError } = await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: messageType,
      content: messageContent,
      audio_url: audioUrl,
      image_url: imageUrl,
      meta_message_id: messageSid,
      processed_at: new Date().toISOString()
    }).select().single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
    }

    // Llamar a whatsapp-ai-agent
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
      'whatsapp-ai-agent',
      {
        body: {
          tenantId,
          message: messageContent,
          conversationId: conversation.id,
          messageId: insertedMessage?.id,
          imageUrl: imageUrl || undefined
        },
        headers: {
          'x-internal-secret': Deno.env.get('INTERNAL_WEBHOOK_SECRET') || ''
        }
      }
    );

    if (aiError || !aiResponse?.response) {
      console.error('AI processing failed:', aiError);
      // Responder con TwiML vacío para no bloquear
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    // Si hay imagen generada, enviarla primero
    if (aiResponse.generatedImageUrl) {
      console.log('🖼️ Sending generated image:', aiResponse.generatedImageUrl);
      const { error: imageError } = await supabase.functions.invoke(
        'whatsapp-send',
        {
          body: {
            to: from,
            message: aiResponse.response,
            imageUrl: aiResponse.generatedImageUrl,
            tenantId,
            conversationId: conversation.id
          },
          headers: { 'x-internal-secret': Deno.env.get('INTERNAL_WEBHOOK_SECRET') || '' }
        }
      );

      if (imageError) {
        console.error('Image send failed:', imageError);
      }
    } else {
      // Enviar respuesta de texto o audio normal
      const { error: sendError } = await supabase.functions.invoke(
        'whatsapp-send',
        {
          body: {
            to: from,
            message: aiResponse.response,
            responseType: messageType === 'audio' ? 'audio' : 'text',
            tenantId,
            conversationId: conversation.id
          },
          headers: { 'x-internal-secret': Deno.env.get('INTERNAL_WEBHOOK_SECRET') || '' }
        }
      );

      if (sendError) {
        console.error('Send failed:', sendError);
      }
    }

    // Log exitoso
    await supabase.from('whatsapp_logs').insert({
      tenant_id: tenantId,
      event_type: 'message_processed',
      payload: { from, type: messageType, conversationId: conversation.id }
    });

    // Twilio espera respuesta TwiML (vacía porque respondemos async via API)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);

    // Siempre responder TwiML válido a Twilio
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
