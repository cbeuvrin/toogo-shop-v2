import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener configuración del chatbot desde la base de datos
    const { data: chatbotConfig, error: configError } = await supabase
      .from('chatbot_settings')
      .select('system_prompt, max_tokens, temperature')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching chatbot config:', configError);
    }

    // Usar configuración por defecto si no hay configuración en DB
    const systemPrompt = chatbotConfig?.system_prompt || `¡Hola! 👋 Soy Toogi, tu mascota digital súper simpática de Toogo!

🚨 REGLAS IMPORTANTES DE RESPUESTA:
- SOLO respondes sobre Toogo (crear tiendas, vender, usar la plataforma)
- Si preguntan algo NO relacionado con Toogo, dices: "¡Solo sé de Toogo! ¿Te ayudo con tu tienda?"
- MÁXIMO 3 pasos por respuesta
- Si hay más de 3 pasos, al tercer paso preguntas: "¿Continúo con los siguientes pasos o prefieres que esperemos?"
- Mantén respuestas CORTAS y directas
- NO des explicaciones técnicas generales

📱 DEFINICIONES ESPECÍFICAS DE TOOGO:
- "¿Qué es un subdominio?" → "En Toogo, tu subdominio es tu dirección gratis como mitienda.toogo.store"
- "¿Qué es un dominio?" → "En Toogo, tu dominio personalizado es como mitienda.com (Plan Basic)"
- "¿Cómo funciona?" → Explica solo cómo funciona Toogo, no conceptos generales

✨ QUÉ ES TOOGO:
Toogo es la forma MÁS FÁCIL de tener tu tienda en internet y ADMINISTRARLA desde WhatsApp: subes un producto mandando una foto con el precio, cambias precios y consultas tus ventas por chat. ¡En 5 minutos ya estás vendiendo!
OJO: Toogo NO es una herramienta para "vender por WhatsApp" (eso lo hace cualquier catálogo-chat). Es la tienda en línea que TÚ administras por WhatsApp.

🆓 PLAN GRATUITO (Subdominio .toogo.store):
- Dirección: "mitienda.toogo.store"
- Hasta 20 productos
- Administra tu tienda por WhatsApp
- ¡Gratis para siempre!

💎 PLAN BASIC (Dominio personalizado):
- Dirección: "mitienda.com" 
- Productos ilimitados
- Pasarelas de pago
- $299 MXN/mes

🚀 PROCESO REAL PARA EMPEZAR (RESPUESTAS CORTAS):

Si preguntan "¿Cómo empiezo?":
PASO 1: Ir a Toogo y dar click en "Comenzar gratis"
PASO 2: Elegir entre subdominio gratis (.toogo.store) o dominio Pro (.com)  
PASO 3: Verificar que tu nombre esté disponible

¿Continúo con los siguientes pasos o prefieres que esperemos?

Si dicen "continúa":
PASO 4: Crear cuenta (email, teléfono, país, contraseña)
PASO 5: Verificar email con código de 6 dígitos
PASO 6: Si elegiste gratis, ¡ya tienes tu tienda! Si elegiste Pro, pagar y esperar configuración

🏪 CÓMO FUNCIONA PARA TUS CLIENTES:
1. Ven tu tienda bonita
2. Eligen productos  
3. Dan click en "Pedir por WhatsApp"

¿Continúo explicando cómo sigue?`;
    
    const maxTokens = chatbotConfig?.max_tokens || 150;
    const temperature = chatbotConfig?.temperature || 0.7;

    console.log('Using chatbot config:', { 
      hasCustomPrompt: !!chatbotConfig?.system_prompt,
      maxTokens,
      temperature 
    });

    // Gemini directo con la llave propia de TOOGO (GOOGLE_AI_API_KEY, la misma que
    // ya usan gemini-image-processor, ai-quick-setup y whatsapp-ai-agent), en vez de
    // la pasarela de Lovable. Dos razones: dejamos de depender de un intermediario
    // del que ya migramos, y usamos un modelo sin razonamiento.
    //
    // OJO con el modelo: antes era gemini-3-pro-preview, que piensa antes de
    // responder y consume el presupuesto de tokens razonando. Con max_tokens 500
    // cortaba TODAS las respuestas a media palabra (57 caracteres). Para un
    // asistente de soporte no hace falta un modelo de razonamiento.
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    const MODELO = 'gemini-2.5-flash';

    const llamarGemini = async () => {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: temperature,
            },
          }),
        },
      );
      if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      const texto = j?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text).join('') ?? '';
      if (!texto.trim()) throw new Error('Gemini devolvió una respuesta vacía');
      return texto;
    };

    // Respaldo temporal: si la llave propia falla, Toogi sigue contestando por la
    // pasarela de Lovable en vez de quedarse mudo frente a un visitante. Cuando
    // lleve un tiempo estable con Gemini directo, este bloque se puede borrar
    // junto con el secreto LOVABLE_API_KEY.
    let assistantMessage: string;
    try {
      if (!GOOGLE_AI_API_KEY) throw new Error('Falta GOOGLE_AI_API_KEY');
      assistantMessage = await llamarGemini();
      console.log('Respuesta generada con Gemini directo:', MODELO);
    } catch (errGemini) {
      console.error('[chat-assistant] Gemini directo falló, uso la pasarela de Lovable:', errGemini);
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false
        }),
      });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Por favor, intenta de nuevo en un momento.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          message: 'Sin créditos disponibles. Contacta al administrador.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorData = await response.json();
      console.error('Lovable AI Error:', errorData);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

      const data = await response.json();
      assistantMessage = data.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error('La pasarela de Lovable tampoco devolvió respuesta');
      }
    }

    console.log('Chat response generated successfully');

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      message: 'Lo siento, no pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});