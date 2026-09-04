// Herramientas de diseño del "Diseñador IA". Módulo compartido entre el
// agente de WhatsApp (whatsapp-ai-agent) y el analizador de inspiración
// (design-from-inspiration, Fase 2).
//
// A propósito NO importa nada: recibe el cliente de Supabase (service role)
// ya creado, así se prueba con un mock en `deno test` sin red.
//
// Las claves element_type/element_id y la forma del JSON replican EXACTAMENTE
// lo que escribe el editor visual (DashboardVisualEditor.tsx). Esa paridad es
// el contrato del producto: todo lo que la IA toca queda editable a mano.

export const TEMPLATE_IDS = [
  'default', 'simple_live', 'minimal', 'fashion', 'fashion_hero',
  'trendy_fashion', 'nature', 'premium_brand', 'bauhaus', 'cyber',
] as const;

// id técnico → nombre con el que el vendedor conoce cada plantilla
// (src/lib/templatesCatalog.ts — mantener en sincronía).
export const TEMPLATE_NAMES: Record<string, string> = {
  default: 'Atlántico',
  simple_live: 'Pacífico',
  minimal: 'Mediterráneo',
  fashion: 'Adriático',
  fashion_hero: 'Índico',
  trendy_fashion: 'Caribe',
  nature: 'Nature & Earth',
  premium_brand: 'Premium Brand',
  bauhaus: 'Bauhaus',
  cyber: 'Cyber',
};

// Tokens de src/lib/heroFonts.ts — mantener en sincronía.
export const HERO_FONT_TOKENS = [
  'default', 'sans', 'serif', 'mono',
  'poppins', 'montserrat', 'oswald', 'bebas', 'playfair', 'lobster',
];

const HERO_TEXT_ELEMENTS = [
  'eyebrow', 'title', 'message', 'cta1', 'cta2',
  'sectionTitle1', 'sectionLink1', 'midBannerTitle', 'sectionTitle2',
  'footerHeading1', 'footerHeading2', 'footerHeading3',
];

// Nodos cuyo TEXTO vive en campos top-level del hero (no en styles[key].text).
// Réplica exacta de handleSaveHeroElement en DashboardVisualEditor.tsx.
const HERO_TOP_LEVEL_TEXT: Record<string, string> = {
  title: 'title',
  message: 'message',
  cta1: 'cta1Label',
  cta2: 'cta2Label',
  eyebrow: 'eyebrowText',
};

const SECTION_KEYS = ['hero', 'section1', 'section2', 'footer'];
const HEX = /^#[0-9a-fA-F]{6}$/;

function badColor(value: unknown): boolean {
  return value !== undefined && (typeof value !== 'string' || !HEX.test(value));
}

/** Quita claves undefined para que el merge no pise valores existentes. */
function definedOnly(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const colorDesc = 'hex #RRGGBB; omite el campo para no tocarlo';

export const DESIGN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_design_state',
      description:
        'Lee el estado visual completo de la tienda: plantilla actual, colores globales, anuncio, ticker, text banner, testimonios, textos del hero, fondos de sección y banners. Úsalo ANTES de hacer cambios amplios de diseño para tocar solo lo necesario.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_template',
      description:
        `Cambia la plantilla (diseño base) de la tienda. Los productos y la configuración se conservan. Plantillas: ${Object.entries(TEMPLATE_NAMES).map(([id, n]) => `${id} = ${n}`).join(', ')}.`,
      parameters: {
        type: 'object',
        properties: {
          templateId: { type: 'string', enum: [...TEMPLATE_IDS], description: 'id técnico de la plantilla' },
        },
        required: ['templateId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_announcement',
      description:
        'Edita la barra de anuncio (franja de texto corta arriba del todo de la tienda). Solo cambia los campos que envíes; el resto se conserva.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          enabled: { type: 'boolean' },
          link: { type: 'string', description: 'URL opcional al hacer click' },
          bgColor: { type: 'string', description: colorDesc },
          textColor: { type: 'string', description: colorDesc },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_ticker',
      description:
        'Edita el ticker (cinta de texto en movimiento). Solo cambia los campos que envíes.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          enabled: { type: 'boolean' },
          fontSize: { type: 'number', description: 'tamaño en px' },
          animated: { type: 'boolean', description: 'false = texto fijo sin marquee' },
          bgColor: { type: 'string', description: colorDesc },
          textColor: { type: 'string', description: colorDesc },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_text_banner',
      description:
        'Edita el text banner (sección de texto grande con botón, a mitad de página). Solo cambia los campos que envíes.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          isActive: { type: 'boolean' },
          buttonEnabled: { type: 'boolean' },
          buttonLabel: { type: 'string' },
          buttonBgColor: { type: 'string', description: colorDesc },
          buttonTextColor: { type: 'string', description: colorDesc },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_testimonials',
      description:
        'Edita la sección de testimonios. Si envías list, REEMPLAZA la lista completa (usa get_design_state para leer la actual y conservar los que quieras).',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          title: { type: 'string' },
          list: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                author: { type: 'string' },
                role: { type: 'string' },
                company: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['author', 'text'],
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_hero_text',
      description:
        `Edita un texto de la portada (hero) y/o su estilo. element: eyebrow, title, message, cta1, cta2 (nodos principales), o sectionTitle1, sectionLink1, midBannerTitle, sectionTitle2, footerHeading1..3 (títulos de sección y footer). Fuentes permitidas: ${HERO_FONT_TOKENS.join(', ')}.`,
      parameters: {
        type: 'object',
        properties: {
          element: { type: 'string', enum: [...HERO_TEXT_ELEMENTS] },
          text: { type: 'string' },
          color: { type: 'string', description: colorDesc },
          bgColor: { type: 'string', description: 'solo para cta1/cta2 (fondo del botón); ' + colorDesc },
          fontFamily: { type: 'string', enum: [...HERO_FONT_TOKENS] },
          fontSize: { type: 'number', description: 'px (desktop)' },
        },
        required: ['element'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_section_background',
      description:
        'Cambia el color de fondo de una sección de la tienda. section: hero, section1, section2 o footer. bgColor: hex #RRGGBB, o la palabra "default" para volver al color original de la plantilla.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: [...SECTION_KEYS] },
          bgColor: { type: 'string' },
        },
        required: ['section', 'bgColor'],
      },
    },
  },
];

export function isDesignTool(name: string): boolean {
  return DESIGN_TOOLS.some((t) => t.function.name === name);
}

async function readElement(supabase: any, tenantId: string, type: string, id: string) {
  const { data } = await supabase
    .from('visual_editor_data')
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('element_type', type)
    .eq('element_id', id)
    .maybeSingle();
  return (data?.data as Record<string, unknown>) ?? {};
}

async function writeElement(
  supabase: any, tenantId: string, type: string, id: string, data: Record<string, unknown>,
) {
  const { error } = await supabase.from('visual_editor_data').upsert(
    { tenant_id: tenantId, element_type: type, element_id: id, data },
    { onConflict: 'tenant_id,element_type,element_id' },
  );
  return error ? { success: false, error: error.message } : { success: true, data };
}

async function mergeElement(
  supabase: any, tenantId: string, type: string, id: string, patch: Record<string, unknown>,
) {
  const current = await readElement(supabase, tenantId, type, id);
  return writeElement(supabase, tenantId, type, id, { ...current, ...definedOnly(patch) });
}

function firstBadColor(args: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) if (badColor(args[f])) return f;
  return null;
}

export async function executeDesignTool(
  supabase: any, tenantId: string, name: string, args: Record<string, any>,
): Promise<any> {
  switch (name) {
    case 'get_design_state': {
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('template_id, primary_color, secondary_color, store_background_color, navbar_bg_color, logo_url')
        .eq('tenant_id', tenantId)
        .single();
      const { data: rows } = await supabase
        .from('visual_editor_data')
        .select('element_type, element_id, data')
        .eq('tenant_id', tenantId);
      const all: any[] = rows ?? [];
      const find = (t: string, i: string) =>
        all.find((r) => r.element_type === t && r.element_id === i)?.data ?? null;
      const hero = (find('hero', 'main_hero') as Record<string, any>) ?? {};
      const templateId = settings?.template_id || 'default';
      return {
        template: { id: templateId, nombre: TEMPLATE_NAMES[templateId] ?? templateId, disponibles: TEMPLATE_NAMES },
        colores: settings
          ? {
              primario: settings.primary_color,
              secundario: settings.secondary_color,
              fondo: settings.store_background_color,
              navbar: settings.navbar_bg_color,
            }
          : null,
        anuncio: find('announcement', 'top_bar'),
        ticker: find('ticker', 'ticker_bar'),
        textBanner: find('text_banner', 'main_text_banner'),
        testimonios: find('testimonials', 'main_testimonials'),
        hero: {
          eyebrowText: hero.eyebrowText, title: hero.title, message: hero.message,
          cta1Label: hero.cta1Label, cta2Label: hero.cta2Label,
          sectionBg: hero.sectionBg ?? null, styles: hero.styles ?? null,
        },
        banners: all
          .filter((r) => r.element_type === 'banner')
          .map((r) => ({ id: r.element_id, sort: r.data?.sort, imageUrl: r.data?.imageUrl })),
      };
    }

    case 'set_template': {
      if (!(TEMPLATE_IDS as readonly string[]).includes(args.templateId)) {
        return { success: false, error: `templateId inválido. Usa uno de: ${TEMPLATE_IDS.join(', ')}` };
      }
      const { error } = await supabase
        .from('tenant_settings')
        .update({ template_id: args.templateId })
        .eq('tenant_id', tenantId);
      return error
        ? { success: false, error: error.message }
        : { success: true, plantilla: TEMPLATE_NAMES[args.templateId] };
    }

    case 'update_announcement': {
      const bad = firstBadColor(args, ['bgColor', 'textColor']);
      if (bad) return { success: false, error: `${bad} debe ser hex #RRGGBB` };
      return mergeElement(supabase, tenantId, 'announcement', 'top_bar', {
        text: args.text, enabled: args.enabled, link: args.link,
        bgColor: args.bgColor, textColor: args.textColor,
      });
    }

    case 'update_ticker': {
      const bad = firstBadColor(args, ['bgColor', 'textColor']);
      if (bad) return { success: false, error: `${bad} debe ser hex #RRGGBB` };
      return mergeElement(supabase, tenantId, 'ticker', 'ticker_bar', {
        text: args.text, enabled: args.enabled, fontSize: args.fontSize,
        animated: args.animated, bgColor: args.bgColor, textColor: args.textColor,
      });
    }

    case 'update_text_banner': {
      const bad = firstBadColor(args, ['buttonBgColor', 'buttonTextColor']);
      if (bad) return { success: false, error: `${bad} debe ser hex #RRGGBB` };
      return mergeElement(supabase, tenantId, 'text_banner', 'main_text_banner', {
        text: args.text, isActive: args.isActive, buttonEnabled: args.buttonEnabled,
        buttonLabel: args.buttonLabel, buttonBgColor: args.buttonBgColor,
        buttonTextColor: args.buttonTextColor,
      });
    }

    case 'update_testimonials': {
      const patch: Record<string, unknown> = { enabled: args.enabled, title: args.title };
      if (Array.isArray(args.list)) {
        patch.list = args.list.map((t: any, i: number) => ({
          id: t.id || `ai_${Date.now()}_${i}`,
          author: String(t.author ?? ''),
          role: String(t.role ?? ''),
          company: String(t.company ?? ''),
          text: String(t.text ?? ''),
          logo: '',
        }));
      }
      return mergeElement(supabase, tenantId, 'testimonials', 'main_testimonials', patch);
    }

    case 'update_hero_text': {
      const el = String(args.element ?? '');
      if (!HERO_TEXT_ELEMENTS.includes(el)) {
        return { success: false, error: `element inválido: ${el}. Usa: ${HERO_TEXT_ELEMENTS.join(', ')}` };
      }
      const bad = firstBadColor(args, ['color', 'bgColor']);
      if (bad) return { success: false, error: `${bad} debe ser hex #RRGGBB` };
      if (args.fontFamily !== undefined && !HERO_FONT_TOKENS.includes(args.fontFamily)) {
        return { success: false, error: `fontFamily inválida. Tokens: ${HERO_FONT_TOKENS.join(', ')}` };
      }
      const current = await readElement(supabase, tenantId, 'hero', 'main_hero');
      const styles = (current.styles as Record<string, any>) ?? {};
      const styleEntry: Record<string, unknown> = {
        ...(styles[el] ?? {}),
        ...definedOnly({
          color: args.color, bgColor: args.bgColor,
          fontFamily: args.fontFamily, fontSize: args.fontSize,
        }),
      };
      const topField = HERO_TOP_LEVEL_TEXT[el];
      // Nodos secundarios: el texto vive dentro de styles[key].text.
      if (!topField && args.text !== undefined) styleEntry.text = args.text;
      const merged: Record<string, unknown> = {
        ...current,
        ...(topField && args.text !== undefined ? { [topField]: args.text } : {}),
        styles: { ...styles, [el]: styleEntry },
      };
      return writeElement(supabase, tenantId, 'hero', 'main_hero', merged);
    }

    case 'set_section_background': {
      if (!SECTION_KEYS.includes(args.section)) {
        return { success: false, error: `section inválida. Usa: ${SECTION_KEYS.join(', ')}` };
      }
      const value = args.bgColor === 'default' ? null : args.bgColor;
      if (value !== null && badColor(value)) {
        return { success: false, error: 'bgColor debe ser hex #RRGGBB o "default"' };
      }
      const current = await readElement(supabase, tenantId, 'hero', 'main_hero');
      const merged = {
        ...current,
        sectionBg: { ...((current.sectionBg as Record<string, unknown>) ?? {}), [args.section]: value },
      };
      return writeElement(supabase, tenantId, 'hero', 'main_hero', merged);
    }

    default:
      return { success: false, error: `Herramienta de diseño desconocida: ${name}` };
  }
}

// ── Fase 2 (wizard de inspiración) ───────────────────────────────────────────

export interface ThemeProposal {
  name: string;
  rationale: string;
  templateId: string;
  colors: { primary: string; secondary: string; background: string; navbar: string };
  announcementText?: string;
  tickerText?: string;
  heroTitleFont?: string;
  heroTitleColor?: string;
  sectionBackgrounds?: { hero?: string; section1?: string; section2?: string; footer?: string };
}

/** null = propuesta válida; string = motivo del rechazo. */
export function validateThemeProposal(p: any): string | null {
  if (!p || typeof p !== 'object') return 'propuesta vacía';
  if (!p.name || typeof p.name !== 'string') return 'falta name';
  if (!p.rationale || typeof p.rationale !== 'string') return 'falta rationale';
  if (!(TEMPLATE_IDS as readonly string[]).includes(p.templateId)) {
    return `templateId inválido: ${p.templateId}`;
  }
  const c = p.colors ?? {};
  for (const k of ['primary', 'secondary', 'background', 'navbar']) {
    if (typeof c[k] !== 'string' || !HEX.test(c[k])) return `color ${k} inválido`;
  }
  for (const k of ['announcementText', 'tickerText']) {
    const v = (p as Record<string, unknown>)[k];
    if (v !== undefined && (typeof v !== 'string' || v.length === 0 || v.length > 120)) {
      return `${k} inválido`;
    }
  }
  if (p.heroTitleFont !== undefined && !HERO_FONT_TOKENS.includes(p.heroTitleFont)) {
    return 'heroTitleFont inválida';
  }
  if (p.heroTitleColor !== undefined && (typeof p.heroTitleColor !== 'string' || !HEX.test(p.heroTitleColor))) {
    return 'heroTitleColor inválido';
  }
  if (p.sectionBackgrounds !== undefined) {
    if (typeof p.sectionBackgrounds !== 'object' || p.sectionBackgrounds === null || Array.isArray(p.sectionBackgrounds)) {
      return 'sectionBackgrounds inválido';
    }
    for (const [k, v] of Object.entries(p.sectionBackgrounds)) {
      if (!SECTION_KEYS.includes(k)) return `sección inválida en sectionBackgrounds: ${k}`;
      if (typeof v !== 'string' || !HEX.test(v)) return `color de fondo inválido en ${k}`;
    }
  }
  return null;
}
