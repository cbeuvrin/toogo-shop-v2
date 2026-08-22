import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { HERO_FONT_TOKENS, TEMPLATE_IDS, validateThemeProposal } from '../_shared/designTools.ts';
import { buildInspirationPrompt, validateInspirationInput } from '../_shared/inspiration.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analiza la inspiración y propone temas. SOLO LECTURA: esta función no
// escribe nada en la base — aplicar el tema lo hace el cliente bajo RLS.
// Sonnet (no Haiku): una sola llamada con visión por uso del wizard; la
// calidad de la propuesta ES el producto aquí.
const ANTHROPIC_MODEL = 'claude-sonnet-5';

const proposeTool = {
  name: 'propose_store_themes',
  description: 'Devuelve 2 o 3 propuestas de tema para la tienda del usuario',
  input_schema: {
    type: 'object',
    properties: {
      proposals: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'nombre corto del tema, en español' },
            rationale: { type: 'string', description: '1 frase: por qué le va a esta marca' },
            templateId: { type: 'string', enum: [...TEMPLATE_IDS] },
            colors: {
              type: 'object',
              properties: {
                primary: { type: 'string', description: 'hex #RRGGBB' },
                secondary: { type: 'string', description: 'hex #RRGGBB' },
                background: { type: 'string', description: 'hex #RRGGBB' },
                navbar: { type: 'string', description: 'hex #RRGGBB' },
              },
              required: ['primary', 'secondary', 'background', 'navbar'],
            },
            announcementText: { type: 'string' },
            tickerText: { type: 'string' },
            heroTitleFont: {
              type: 'string',
              enum: [...HERO_FONT_TOKENS],
              description: 'tipografía del título del hero acorde al mood',
            },
            heroTitleColor: { type: 'string', description: 'hex #RRGGBB para el título del hero' },
            sectionBackgrounds: {
              type: 'object',
              properties: {
                hero: { type: 'string' },
                section1: { type: 'string' },
                section2: { type: 'string' },
                footer: { type: 'string' },
              },
              description: 'fondos por sección en hex #RRGGBB, solo si aportan al look',
            },
          },
          required: ['name', 'rationale', 'templateId', 'colors'],
        },
      },
    },
    required: ['proposals'],
  },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const invalid = validateInspirationInput(body);
    if (invalid) return json(400, { error: invalid });
    const { tenantId, imageBase64, mimeType, description } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: usuario autenticado con rol en el tenant (mismo patrón "Path B"
    // que whatsapp-ai-agent). Sin vía de secreto interno: solo dashboard.
    const authHeader = req.headers.get('Authorization');
    let callerUserId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      callerUserId = user?.id ?? null;
    }
    if (!callerUserId) return json(401, { error: 'Unauthorized' });

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!role) {
      const { data: superAdmin } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUserId)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (!superAdmin) return json(403, { error: 'Forbidden: no access to this tenant' });
    }

    // Llamada a Claude con visión + tool forzado (salida estructurada).
    const content: any[] = [];
    if (imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: imageBase64 },
      });
    }
    content.push({
      type: 'text',
      text: imageBase64
        ? 'Esta es la tienda que me gusta como inspiración. Proponme los temas.'
        : 'No tengo captura; trabaja solo con mi descripción. Proponme los temas.',
    });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: buildInspirationPrompt(description),
        messages: [{ role: 'user', content }],
        tools: [proposeTool],
        tool_choice: { type: 'tool', name: 'propose_store_themes' },
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('Anthropic error:', err);
      return json(502, { error: 'El analizador no está disponible en este momento. Intenta de nuevo.' });
    }
    const ai = await resp.json();
    const toolUse = (ai.content ?? []).find((b: any) => b.type === 'tool_use');
    const raw: any[] = toolUse?.input?.proposals ?? [];
    const proposals = raw.filter((p) => validateThemeProposal(p) === null).slice(0, 3);
    if (proposals.length === 0) {
      console.error('Propuestas inválidas:', JSON.stringify(raw).slice(0, 500));
      return json(502, { error: 'No pude armar propuestas con esa inspiración. Intenta con otra captura o más detalle.' });
    }

    return json(200, { proposals });
  } catch (e) {
    console.error('design-from-inspiration:', e);
    return json(500, { error: (e as Error).message });
  }
});
