# Diseñador IA — Fase 1: Motor de diseño + chat en el dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El comerciante escribe en un chat del editor visual (o por WhatsApp) qué quiere cambiar del diseño y la IA lo aplica escribiendo los mismos datos que escribiría el editor a mano, con botón "Deshacer".

**Architecture:** Un módulo compartido de herramientas de diseño (`supabase/functions/_shared/designTools.ts`) se enchufa al agente existente `whatsapp-ai-agent` (Claude Haiku 4.5, loop de tools ya construido, auth de dashboard ya soportada). El frontend agrega un panel de chat dentro de `DashboardVisualEditor` y un sistema de snapshots client-side (tabla nueva `design_snapshots` con RLS) para deshacer.

**Tech Stack:** Deno (edge functions Supabase), Anthropic Messages API (Haiku 4.5), React + TS + Tailwind + shadcn, supabase-js v2, Postgres RLS.

**Spec:** `docs/superpowers/specs/2026-08-21-disenador-ia-nivel1.md`

## Global Constraints

- Rama de trabajo: `feat/disenador-ia-fase1`. Nada se mergea a `main` ni se deploya sin OK de Carlos.
- `whatsapp-ai-agent` se deploya SIN `--no-verify-jwt` (mantiene `verify_jwt=true`).
- Modelo del agente: NO cambiar (`claude-haiku-4-5-20251001`).
- NO tocar: `supabase/functions/chat-assistant/` (widget del cliente final), `src/components/OnboardingModal.tsx`, la carpeta `keting/`.
- Colores siempre hex `#RRGGBB`. Copy en español neutro con "tú". Strings visibles al usuario marcados "VALIDAR CON CARLOS" antes de deploy.
- Imports de edge functions: exactamente `https://deno.land/std@0.168.0/http/server.ts` y `https://esm.sh/@supabase/supabase-js@2.57.0` (los mismos del agente).
- Los upserts a `visual_editor_data` SIEMPRE con `onConflict: 'tenant_id,element_type,element_id'`.
- Commits en español, mensaje corto + cuerpo si aporta.

---

### Task 0: Rama + prerequisito Deno

**Files:** ninguno (setup).

**Interfaces:**
- Produces: rama `feat/disenador-ia-fase1` y `deno` disponible en PATH (lo consumen los `deno test` de Tasks 2 y el `deno check` de Task 3).

- [ ] **Step 1: Crear la rama**

```bash
cd "/Users/carlosbeuvrin/Documents/KETING MEDIA/NUEVOS PROYECTOS ANTIGRAVITY/TOOGO 4 claude + 10 plantillas/toogo-shop-builder-main"
git checkout main && git pull --ff-only origin main
git checkout -b feat/disenador-ia-fase1
```

- [ ] **Step 2: Instalar Deno (no está instalado en esta máquina)**

```bash
brew install deno
deno --version
```
Expected: imprime `deno 2.x`.

---

### Task 1: Tabla `design_snapshots` (migración + RLS)

**Files:**
- Create: `supabase/migrations/20260821120000_design_snapshots.sql`

**Interfaces:**
- Produces: tabla `public.design_snapshots(id uuid, tenant_id uuid, label text, payload jsonb, created_at timestamptz)` con RLS "miembros del tenant: ALL". La consumen `src/lib/designSnapshots.ts` (Task 4) y el wizard de Fase 2.

- [ ] **Step 1: Escribir la migración**

Contenido completo de `supabase/migrations/20260821120000_design_snapshots.sql`:

```sql
-- Snapshots del estado visual de una tienda para el botón "Deshacer" del
-- Diseñador IA. payload = { settings: {...tenant_settings visual...},
-- elements: [{element_type, element_id, data}] }.
create table if not exists public.design_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.design_snapshots enable row level security;

-- Mismo criterio de acceso que ya usa el editor visual: cualquier usuario con
-- un rol en el tenant puede leer/escribir sus snapshots.
create policy "tenant members manage design snapshots"
  on public.design_snapshots
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_snapshots.tenant_id
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_snapshots.tenant_id
    )
  );

create index if not exists design_snapshots_tenant_created_idx
  on public.design_snapshots (tenant_id, created_at desc);
```

- [ ] **Step 2: Aplicar la migración**

```bash
npx supabase db push
```
Expected: `Applying migration 20260821120000_design_snapshots.sql... Finished`.

- [ ] **Step 3: Verificar que la tabla existe y la RLS aplica**

En el SQL editor del dashboard de Supabase (proyecto `herqxhfmsstbteahhxpr`):

```sql
select relrowsecurity from pg_class where relname = 'design_snapshots';
```
Expected: `t` (RLS activa).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260821120000_design_snapshots.sql
git commit -m "feat(diseñador-ia): tabla design_snapshots con RLS para deshacer"
```

---

### Task 2: Módulo compartido `designTools.ts` + tests en Deno

**Files:**
- Create: `supabase/functions/_shared/designTools.ts`
- Test: `supabase/functions/_shared/designTools.test.ts`

**Interfaces:**
- Consumes: nada (a propósito: recibe el cliente Supabase por parámetro para poder testearse con mock, sin red).
- Produces (los consume Task 3 y la Fase 2):
  - `DESIGN_TOOLS: Array<{type:'function', function:{name, description, parameters}}>` (mismo formato OpenAI-style que el array `tools` del agente; la conversión a formato Anthropic la hace el `toAnthropicTools` que ya existe).
  - `isDesignTool(name: string): boolean`
  - `executeDesignTool(supabase: any, tenantId: string, name: string, args: any): Promise<any>` — devuelve `{success:boolean, ...}` o el objeto de datos (para `get_design_state`).
  - `TEMPLATE_IDS: readonly string[]`, `TEMPLATE_NAMES: Record<string,string>`, `HERO_FONT_TOKENS: string[]`
  - `validateThemeProposal(p: any): string | null` (lo consume la Fase 2; `null` = válida).

- [ ] **Step 1: Escribir los tests (fallan porque el módulo no existe)**

Contenido completo de `supabase/functions/_shared/designTools.test.ts`:

```ts
// deno test supabase/functions/_shared/designTools.test.ts
// Sin dependencias externas: asserts propios + mock del cliente Supabase.
import {
  DESIGN_TOOLS,
  executeDesignTool,
  isDesignTool,
  TEMPLATE_IDS,
  validateThemeProposal,
} from './designTools.ts';

function assertEq(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg}\n  actual:   ${a}\n  expected: ${b}`);
}
function assertTrue(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// Mock mínimo del query builder de supabase-js. Estado en memoria:
// state.settings = fila de tenant_settings; state.elements = mapa
// "element_type/element_id" -> data. Registra cada escritura en `writes`.
function makeMock(state: { settings?: any; elements?: Record<string, any> }) {
  const writes: any[] = [];
  function from(table: string) {
    const q: any = { _table: table, _filters: {} as Record<string, any>, _op: 'select' };
    q.select = () => q;
    q.eq = (col: string, val: any) => { q._filters[col] = val; return q; };
    q.update = (payload: any) => { q._op = 'update'; q._payload = payload; return q; };
    q.upsert = (payload: any, opts: any) => {
      q._op = 'upsert';
      writes.push({ table, op: 'upsert', payload, opts });
      return q;
    };
    q.single = async () => ({
      data: table === 'tenant_settings' ? (state.settings ?? null) : null,
      error: null,
    });
    q.maybeSingle = async () => {
      const key = `${q._filters['element_type']}/${q._filters['element_id']}`;
      const d = state.elements?.[key];
      return { data: d !== undefined ? { data: d } : null, error: null };
    };
    // Terminador implícito (await sobre el builder): update o select-lista.
    q.then = (resolve: any, reject: any) => {
      if (q._op === 'update') {
        writes.push({ table, op: 'update', payload: q._payload, filters: { ...q._filters } });
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
      if (q._op === 'upsert') {
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
      const rows = Object.entries(state.elements ?? {}).map(([k, v]) => {
        const [t, ...rest] = k.split('/');
        return { element_type: t, element_id: rest.join('/'), data: v };
      });
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    };
    return q;
  }
  return { client: { from }, writes };
}

Deno.test('DESIGN_TOOLS: nombres únicos y schema completo', () => {
  const names = DESIGN_TOOLS.map((t: any) => t.function.name);
  assertEq(names.length, new Set(names).size, 'hay nombres de tool duplicados');
  for (const t of DESIGN_TOOLS as any[]) {
    assertTrue(t.type === 'function', `tool sin type function: ${t.function?.name}`);
    assertTrue(t.function.description?.length > 10, `descripción pobre en ${t.function.name}`);
    assertEq(t.function.parameters.type, 'object', `parameters.type debe ser object en ${t.function.name}`);
    assertTrue(isDesignTool(t.function.name), `isDesignTool no reconoce ${t.function.name}`);
  }
  assertTrue(!isDesignTool('update_product'), 'isDesignTool no debe capturar tools del agente base');
});

Deno.test('set_template: rechaza id inválido sin escribir', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'set_template', { templateId: 'no_existe' });
  assertEq(r.success, false, 'debió fallar');
  assertEq(writes.length, 0, 'no debió escribir nada');
});

Deno.test('set_template: id válido actualiza tenant_settings.template_id', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'set_template', { templateId: 'trendy_fashion' });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].table, 'tenant_settings', 'tabla equivocada');
  assertEq(writes[0].payload, { template_id: 'trendy_fashion' }, 'payload equivocado');
  assertEq(writes[0].filters, { tenant_id: 't1' }, 'debe filtrar por tenant');
  assertTrue(TEMPLATE_IDS.includes('trendy_fashion' as any), 'catálogo desalineado');
});

Deno.test('update_ticker: hace MERGE con lo existente y usa el par canónico', async () => {
  const { client, writes } = makeMock({
    elements: { 'ticker/ticker_bar': { text: 'Hola', enabled: true } },
  });
  const r = await executeDesignTool(client, 't1', 'update_ticker', { bgColor: '#000000' });
  assertEq(r.success, true, 'debió aplicar');
  const w = writes[0];
  assertEq(w.payload.element_type, 'ticker', 'element_type');
  assertEq(w.payload.element_id, 'ticker_bar', 'element_id');
  assertEq(w.opts, { onConflict: 'tenant_id,element_type,element_id' }, 'onConflict obligatorio');
  assertEq(w.payload.data, { text: 'Hola', enabled: true, bgColor: '#000000' }, 'merge perdió campos');
});

Deno.test('update_announcement: color inválido se rechaza sin escribir', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'update_announcement', { bgColor: 'rojo' });
  assertEq(r.success, false, 'debió rechazar');
  assertEq(writes.length, 0, 'no debió escribir');
});

Deno.test('update_hero_text: nodo principal → texto top-level + estilo en styles', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { title: 'Viejo', styles: { title: { fontSize: 40 } } } },
  });
  const r = await executeDesignTool(client, 't1', 'update_hero_text', {
    element: 'title', text: 'Nuevo título', color: '#FFD700', fontFamily: 'playfair',
  });
  assertEq(r.success, true, 'debió aplicar');
  const d = writes[0].payload.data;
  assertEq(d.title, 'Nuevo título', 'el texto de title vive top-level');
  assertEq(d.styles.title, { fontSize: 40, color: '#FFD700', fontFamily: 'playfair' }, 'estilo mal mergeado');
  assertTrue(d.styles.title.text === undefined, 'title NO guarda text dentro de styles');
});

Deno.test('update_hero_text: nodo secundario guarda el texto DENTRO de styles', async () => {
  const { client, writes } = makeMock({ elements: {} });
  const r = await executeDesignTool(client, 't1', 'update_hero_text', {
    element: 'sectionTitle1', text: 'Recién llegados', color: '#111111',
  });
  assertEq(r.success, true, 'debió aplicar');
  const d = writes[0].payload.data;
  assertEq(d.styles.sectionTitle1.text, 'Recién llegados', 'texto secundario va en styles[key].text');
  assertTrue(d.sectionTitle1 === undefined, 'no debe crear campo top-level');
});

Deno.test('set_section_background: mergea sectionBg sin pisar otras secciones', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { sectionBg: { hero: '#FFFFFF' } } },
  });
  const r = await executeDesignTool(client, 't1', 'set_section_background', {
    section: 'footer', bgColor: '#101010',
  });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].payload.data.sectionBg, { hero: '#FFFFFF', footer: '#101010' }, 'merge de sectionBg');
});

Deno.test('set_section_background: "default" limpia el override (null)', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { sectionBg: { footer: '#101010' } } },
  });
  await executeDesignTool(client, 't1', 'set_section_background', { section: 'footer', bgColor: 'default' });
  assertEq(writes[0].payload.data.sectionBg, { footer: null }, 'default debe traducirse a null');
});

Deno.test('get_design_state: resume plantilla + elementos', async () => {
  const { client } = makeMock({
    settings: { template_id: 'nature', primary_color: '#3F5D3A' },
    elements: {
      'ticker/ticker_bar': { text: 'Envío gratis', enabled: true },
      'banner/banner_1': { imageUrl: 'x.webp', sort: 0 },
    },
  });
  const r = await executeDesignTool(client, 't1', 'get_design_state', {});
  assertEq(r.template.id, 'nature', 'template id');
  assertEq(r.template.nombre, 'Nature & Earth', 'template nombre');
  assertEq(r.ticker, { text: 'Envío gratis', enabled: true }, 'ticker');
  assertEq(r.banners, [{ id: 'banner_1', sort: 0, imageUrl: 'x.webp' }], 'banners');
});

Deno.test('validateThemeProposal: valida catálogo y colores', () => {
  const ok = {
    name: 'Cálido artesanal', rationale: 'va con velas', templateId: 'nature',
    colors: { primary: '#3F5D3A', secondary: '#B5C99A', background: '#FAFAF9', navbar: '#FFFFFF' },
  };
  assertEq(validateThemeProposal(ok), null, 'propuesta válida rechazada');
  assertTrue(validateThemeProposal({ ...ok, templateId: 'zzz' }) !== null, 'template inválida aceptada');
  assertTrue(
    validateThemeProposal({ ...ok, colors: { ...ok.colors, primary: 'azul' } }) !== null,
    'color inválido aceptado',
  );
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan por módulo inexistente**

```bash
deno test supabase/functions/_shared/designTools.test.ts
```
Expected: error `Module not found ... designTools.ts`.

- [ ] **Step 3: Escribir el módulo**

Contenido completo de `supabase/functions/_shared/designTools.ts`:

```ts
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
}

/** null = propuesta válida; string = motivo del rechazo. */
export function validateThemeProposal(p: any): string | null {
  if (!p || typeof p !== 'object') return 'propuesta vacía';
  if (!p.name || typeof p.name !== 'string') return 'falta name';
  if (!(TEMPLATE_IDS as readonly string[]).includes(p.templateId)) {
    return `templateId inválido: ${p.templateId}`;
  }
  const c = p.colors ?? {};
  for (const k of ['primary', 'secondary', 'background', 'navbar']) {
    if (typeof c[k] !== 'string' || !HEX.test(c[k])) return `color ${k} inválido`;
  }
  return null;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
deno test supabase/functions/_shared/designTools.test.ts
```
Expected: `11 passed` (0 failed).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/designTools.ts supabase/functions/_shared/designTools.test.ts
git commit -m "feat(diseñador-ia): módulo compartido de herramientas de diseño con tests"
```

---

### Task 3: Enchufar las design tools al agente `whatsapp-ai-agent`

**Files:**
- Modify: `supabase/functions/whatsapp-ai-agent/index.ts` (5 puntos con anclas exactas, abajo)

**Interfaces:**
- Consumes: `DESIGN_TOOLS`, `isDesignTool`, `executeDesignTool` de Task 2.
- Produces: el endpoint acepta un campo opcional `history: Array<{role:'user'|'assistant', content:string}>` en el body (lo consume el panel de Task 5). Respuesta sin cambios: `{ response, generatedImageUrl }`.

- [ ] **Step 1: Import del módulo**

Al inicio del archivo, después de la línea `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';`, agregar:

```ts
import { DESIGN_TOOLS, isDesignTool, executeDesignTool } from '../_shared/designTools.ts';
```

- [ ] **Step 2: Aceptar `history` en el body**

Ancla (línea ~83): `const { tenantId, message, conversationId, imageUrl, messageId } = await req.json();`
Reemplazar por:

```ts
const { tenantId, message, conversationId, imageUrl, messageId, history } = await req.json();
```

- [ ] **Step 3: Sumar las tools al array**

Ancla: `const tools = [` (línea ~410). Localizar el `];` que CIERRA ese array (justo antes de la conversión con `toAnthropicTools` / del resto del flujo) y, en la línea anterior al cierre, agregar:

```ts
      // Herramientas de diseño compartidas (Diseñador IA) — mismo formato
      // OpenAI-style; la conversión a Anthropic la hace toAnthropicTools.
      ...DESIGN_TOOLS,
```

Verificación puntual: `grep -n "DESIGN_TOOLS" supabase/functions/whatsapp-ai-agent/index.ts` debe mostrar el import y el spread.

- [ ] **Step 4: Despachar las design tools con retorno temprano**

Ancla (línea ~835): `const executeTool = async (functionName: string, args: any): Promise<any> => {`
Insertar como PRIMERAS líneas del cuerpo de esa función:

```ts
      // Diseñador IA: las herramientas de diseño viven en el módulo
      // compartido; retorno temprano para no crecer el switch gigante.
      if (isDesignTool(functionName)) {
        return await executeDesignTool(supabase, tenantId, functionName, args);
      }
```

- [ ] **Step 5: Inyectar el historial del panel en la conversación**

Ancla (línea ~1454): `const convo: any[] = [{ role: 'user', content: message }];`
Reemplazar por:

```ts
    // Historial que manda el panel del dashboard (el chat de WhatsApp trae el
    // suyo por conversationId; este campo es opcional y compatible hacia atrás).
    const clientHistory = Array.isArray(history)
      ? history
          .filter((m: any) =>
            m && (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' && m.content.trim())
          .slice(-12)
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];
    const convo: any[] = [...clientHistory, { role: 'user', content: message }];
```

- [ ] **Step 6: Ampliar el system prompt**

Ancla (línea ~259, dentro del template string del `systemPrompt`): la línea
`- Cambiar colores de la tienda (primario, secundario, fondo, navbar)`.
Inmediatamente después de esa línea, agregar:

```text
- Cambiar la plantilla de la tienda (Atlántico, Pacífico, Mediterráneo, Adriático, Índico, Caribe, Nature & Earth, Premium Brand, Bauhaus, Cyber)
- Editar la barra de anuncio, el ticker, el text banner y los testimonios
- Editar los textos de la portada (título, mensaje, botones) con su color, fuente y tamaño
- Cambiar el color de fondo de cada sección (portada, secciones intermedias, footer)

Reglas para cambios de diseño:
- Antes de un cambio amplio ("hazla más elegante", "ponla en modo oscuro"), llama get_design_state y toca SOLO lo necesario para cumplir lo pedido.
- Después de aplicar cambios, resume en 1-2 frases qué cambiaste exactamente. NUNCA digas que cambiaste algo que ninguna herramienta confirmó con success.
- Si el usuario pide algo que no puedes tocar (p. ej. mover secciones de lugar), dilo claro y sugiere lo más cercano que sí puedes hacer.
```

- [ ] **Step 7: Typecheck de la función**

```bash
deno check supabase/functions/whatsapp-ai-agent/index.ts
```
Expected: sin errores (necesita red la primera vez para cachear los imports de deno.land/esm.sh).

- [ ] **Step 8: Deploy (manteniendo verify_jwt)**

```bash
npx supabase functions deploy whatsapp-ai-agent
```
Expected: `Deployed Functions on project herqxhfmsstbteahhxpr: whatsapp-ai-agent`.
⚠️ SIN `--no-verify-jwt`. La verificación funcional completa llega en Task 7; el riesgo es bajo porque todos los cambios son aditivos (spread + retorno temprano + campo opcional).

- [ ] **Step 9: Regresión rápida del bot por WhatsApp**

Desde el WhatsApp registrado de la tienda de prueba, enviar: `¿cuánto vendí hoy?`
Expected: responde con estadísticas como siempre (el flujo viejo no se rompió).

- [ ] **Step 10: Commit**

```bash
git add supabase/functions/whatsapp-ai-agent/index.ts
git commit -m "feat(diseñador-ia): agente con vocabulario de diseño completo + history opcional"
```

---

### Task 4: Snapshots client-side (`src/lib/designSnapshots.ts`)

**Files:**
- Create: `src/lib/designSnapshots.ts`

**Interfaces:**
- Consumes: tabla `design_snapshots` (Task 1); cliente `supabase` de `@/integrations/supabase/client`.
- Produces (los consumen Task 5 y el wizard de Fase 2):
  - `takeDesignSnapshot(tenantId: string, label: string): Promise<string | null>` — id del snapshot o null si falló.
  - `restoreDesignSnapshot(tenantId: string, snapshotId: string): Promise<boolean>`

- [ ] **Step 1: Escribir el módulo**

Contenido completo de `src/lib/designSnapshots.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

// Snapshot del estado VISUAL de la tienda (no toca productos ni pedidos).
// Se toma ANTES de que el Diseñador IA aplique cambios; restaurarlo es el
// botón "Deshacer". Corre en el cliente bajo RLS — el mismo permiso con el
// que el editor visual ya guarda estos datos a mano.

export interface DesignSnapshotPayload {
  settings: Record<string, unknown> | null;
  elements: Array<{ element_type: string; element_id: string; data: unknown }>;
}

const SETTINGS_FIELDS =
  'template_id, primary_color, secondary_color, store_background_color, navbar_bg_color, logo_url';

const KEEP_SNAPSHOTS = 15;

export async function takeDesignSnapshot(tenantId: string, label: string): Promise<string | null> {
  try {
    const [settingsRes, elementsRes] = await Promise.all([
      supabase.from('tenant_settings').select(SETTINGS_FIELDS).eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('visual_editor_data').select('element_type, element_id, data').eq('tenant_id', tenantId),
    ]);
    const payload: DesignSnapshotPayload = {
      settings: settingsRes.data ?? null,
      elements: elementsRes.data ?? [],
    };
    const { data, error } = await supabase
      .from('design_snapshots')
      .insert({ tenant_id: tenantId, label: label.slice(0, 120), payload })
      .select('id')
      .single();
    if (error || !data) {
      console.error('takeDesignSnapshot:', error);
      return null;
    }
    // Poda: conserva solo los últimos KEEP_SNAPSHOTS.
    const { data: old } = await supabase
      .from('design_snapshots')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 50);
    if (old?.length) {
      await supabase.from('design_snapshots').delete().in('id', old.map((o) => o.id));
    }
    return data.id;
  } catch (e) {
    console.error('takeDesignSnapshot:', e);
    return null;
  }
}

export async function restoreDesignSnapshot(tenantId: string, snapshotId: string): Promise<boolean> {
  try {
    const { data: snap, error } = await supabase
      .from('design_snapshots')
      .select('payload')
      .eq('id', snapshotId)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !snap) return false;
    const p = snap.payload as unknown as DesignSnapshotPayload;

    const ops: PromiseLike<{ error: unknown }>[] = [];
    if (p.settings) {
      ops.push(supabase.from('tenant_settings').update(p.settings).eq('tenant_id', tenantId));
    }
    for (const el of p.elements) {
      ops.push(
        supabase.from('visual_editor_data').upsert(
          { tenant_id: tenantId, element_type: el.element_type, element_id: el.element_id, data: el.data },
          { onConflict: 'tenant_id,element_type,element_id' },
        ),
      );
    }

    // Filas visuales creadas DESPUÉS del snapshot (p. ej. un banner nuevo de
    // la IA) se eliminan para que "deshacer" sea completo. Solo toca
    // visual_editor_data — nunca productos ni pedidos.
    const { data: current } = await supabase
      .from('visual_editor_data')
      .select('element_type, element_id')
      .eq('tenant_id', tenantId);
    const known = new Set(p.elements.map((e) => `${e.element_type}/${e.element_id}`));
    const extras = (current ?? []).filter((r) => !known.has(`${r.element_type}/${r.element_id}`));
    for (const r of extras) {
      ops.push(
        supabase
          .from('visual_editor_data')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('element_type', r.element_type)
          .eq('element_id', r.element_id),
      );
    }

    const results = await Promise.all(ops);
    return results.every((r) => !r.error);
  } catch (e) {
    console.error('restoreDesignSnapshot:', e);
    return false;
  }
}
```

- [ ] **Step 2: Regenerar los tipos de Supabase (obligatorio)**

El `types.ts` generado NO conoce la tabla nueva; sin este paso el cliente tipado rechaza `from('design_snapshots')` y el build falla:

```bash
npx supabase gen types typescript --project-id herqxhfmsstbteahhxpr > src/integrations/supabase/types.ts
git diff --stat src/integrations/supabase/types.ts
```
Expected: el diff agrega el bloque `design_snapshots` (y no borra tablas existentes — si el diff se ve destructivo, descartar con `git checkout -- src/integrations/supabase/types.ts` e investigar antes de seguir).

- [ ] **Step 3: Verificar tipos y build**

```bash
npm run build
```
Expected: `✓ built` sin errores de TS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/designSnapshots.ts src/integrations/supabase/types.ts
git commit -m "feat(diseñador-ia): snapshots de diseño para deshacer (client-side, RLS)"
```

---

### Task 5: Panel de chat `DesignChatPanel`

**Files:**
- Create: `src/components/dashboard3/DesignChatPanel.tsx`

**Interfaces:**
- Consumes: `useTenantContext` (`currentTenantId`), `useTenantSettings().loadSettings`, `takeDesignSnapshot`/`restoreDesignSnapshot` (Task 4), endpoint `whatsapp-ai-agent` con `history` (Task 3), componentes `@/components/ui/button` y `@/components/ui/textarea` (existen).
- Produces: componente `<DesignChatPanel />` sin props (lo monta Task 6) y el evento global `'toogo:design-updated'` (lo escucha Task 6). Además ESCUCHA el evento `'toogo:design-snapshot'` (`detail: { id: string }`): cualquier otra superficie que tome un snapshot (el wizard de Fase 2) lo anuncia así y el botón "Deshacer" del panel lo cubre también.

Copy visible (VALIDAR CON CARLOS antes de deploy): "Diseñador IA", "Dime qué cambiar de tu tienda…", "Deshacer último cambio", "Cambio deshecho", el placeholder y el mensaje de bienvenida.

- [ ] **Step 1: Escribir el componente**

Contenido completo de `src/components/dashboard3/DesignChatPanel.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { takeDesignSnapshot, restoreDesignSnapshot } from '@/lib/designSnapshots';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME =
  'Hola 👋 Soy tu diseñador. Dime qué cambiar de tu tienda: colores, textos de la portada, el anuncio, el ticker, la plantilla… Ejemplo: "pon la barra de anuncio con Envío gratis desde $500 en fondo negro".';

export const DesignChatPanel = () => {
  const { currentTenantId: tenantId } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'assistant', content: WELCOME }]);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Otras superficies (p. ej. el wizard "Diséñala con IA") anuncian sus
  // snapshots por evento; así el botón "Deshacer" de este panel también
  // cubre los cambios que ellas apliquen.
  useEffect(() => {
    const onSnapshot = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setLastSnapshot(id);
    };
    window.addEventListener('toogo:design-snapshot', onSnapshot);
    return () => window.removeEventListener('toogo:design-snapshot', onSnapshot);
  }, []);

  const notifyUpdated = async () => {
    await loadSettings();
    window.dispatchEvent(new CustomEvent('toogo:design-updated'));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !tenantId || busy) return;
    setBusy(true);
    setInput('');
    // El historial NO incluye el mensaje de bienvenida ni el mensaje actual.
    const history = messages
      .filter((m) => m.content !== WELCOME)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    // Snapshot ANTES de que la IA toque nada → habilita "Deshacer".
    const snap = await takeDesignSnapshot(tenantId, text.slice(0, 60));

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-agent', {
        body: { tenantId, message: text, history },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: 'assistant', content: data?.response || 'Listo.' }]);
      if (snap) setLastSnapshot(snap);
      await notifyUpdated();
    } catch (e) {
      console.error('DesignChatPanel:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Algo falló al aplicar el cambio. Inténtalo de nuevo en un momento.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!tenantId || !lastSnapshot || busy) return;
    setBusy(true);
    const ok = await restoreDesignSnapshot(tenantId, lastSnapshot);
    setBusy(false);
    if (ok) {
      setLastSnapshot(null);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Listo, deshice el último cambio. Tu tienda volvió a como estaba.' }]);
      await notifyUpdated();
      toast({ title: 'Cambio deshecho' });
    } else {
      toast({ title: 'No se pudo deshacer', variant: 'destructive' });
    }
  };

  if (!tenantId) return null;

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-violet-700"
        >
          ✨ Diseñador IA
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-violet-600 px-4 py-3 text-white">
            <span className="font-semibold">✨ Diseñador IA</span>
            <div className="flex items-center gap-2">
              {lastSnapshot && (
                <button onClick={undo} disabled={busy} className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
                  ↩︎ Deshacer último cambio
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-xl leading-none" aria-label="Cerrar">×</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-8 rounded-2xl rounded-br-sm bg-violet-600 px-3 py-2 text-sm text-white'
                    : 'mr-8 whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-gray-900'
                }
              >
                {m.content}
              </div>
            ))}
            {busy && <div className="mr-8 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">Aplicando…</div>}
            <div ref={endRef} />
          </div>

          <div className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Dime qué cambiar de tu tienda…"
              rows={2}
              className="min-h-0 flex-1 resize-none"
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()}>Enviar</Button>
          </div>
        </div>
      )}
    </>
  );
};
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard3/DesignChatPanel.tsx
git commit -m "feat(diseñador-ia): panel de chat con snapshot y deshacer"
```

---

### Task 6: Montar el panel en el editor y refrescarlo tras cada cambio de la IA

**Files:**
- Modify: `src/components/dashboard3/DashboardVisualEditor.tsx` (2 puntos)

**Interfaces:**
- Consumes: `<DesignChatPanel />` (Task 5) y el evento `'toogo:design-updated'`.
- Produces: el editor recarga `visual_editor_data` cuando la IA aplica cambios (el preview y los modales muestran lo nuevo sin refrescar la página).

- [ ] **Step 1: Import**

Junto a los demás imports del archivo, agregar:

```tsx
import { DesignChatPanel } from './DesignChatPanel';
```

- [ ] **Step 2: Listener de recarga**

Ancla: el `useEffect` de carga inicial que termina en `}, [tenantId, tenantLoading]);` (línea ~292). Inmediatamente DESPUÉS de ese bloque, agregar:

```tsx
  // El Diseñador IA escribe visual_editor_data por fuera de este componente;
  // cuando avisa, recargamos para que preview y modales muestren lo nuevo.
  useEffect(() => {
    const onDesignUpdated = () => {
      if (tenantId) loadEditorData();
    };
    window.addEventListener('toogo:design-updated', onDesignUpdated);
    return () => window.removeEventListener('toogo:design-updated', onDesignUpdated);
  }, [tenantId]);
```

(`loadEditorData` ya existe en el scope del componente — es la misma función de la carga inicial.)

- [ ] **Step 3: Montar el panel**

Localizar el `return (` principal del componente (`grep -n "return (" src/components/dashboard3/DashboardVisualEditor.tsx` — el primero después de los handlers). Dentro del contenedor raíz del JSX, como ÚLTIMO hijo antes de cerrarlo, agregar:

```tsx
      <DesignChatPanel />
```

- [ ] **Step 4: Build + prueba visual local**

```bash
npm run build && npm run dev
```
En `http://localhost:8080/dashboard` (sesión iniciada con la tienda de prueba): pestaña del editor visual → debe verse el botón flotante "✨ Diseñador IA"; al abrirlo, el mensaje de bienvenida.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard3/DashboardVisualEditor.tsx
git commit -m "feat(diseñador-ia): panel montado en el editor + recarga al aplicar cambios"
```

---

### Task 7: Verificación end-to-end y cierre

**Files:** ninguno (verificación manual + push de la rama).

- [ ] **Step 1: Checklist E2E en local (dev server + funciones ya deployadas)**

Con la tienda de prueba abierta en el editor visual y la tienda pública en otra pestaña:

1. Chat: `Pon la barra de anuncio con el texto "Envío gratis desde $500" con fondo negro y letras blancas` → el asistente confirma; el preview del editor muestra la barra; abrir el modal manual de anuncio → texto `Envío gratis desde $500`, bgColor `#000000`, textColor `#FFFFFF` (paridad editor↔IA).
2. `Deshacer último cambio` → la barra vuelve a su estado anterior en preview y modal.
3. Chat: `Cámbiame la plantilla a Caribe` → `tenant_settings.template_id = 'trendy_fashion'`; el preview cambia de plantilla.
4. Chat: `Pon el título de la portada en dorado con la fuente Playfair` → hero/main_hero: `styles.title.color = '#FFD700'` (o dorado similar), `fontFamily = 'playfair'`; visible en preview.
5. Chat con memoria: `ahora un poco más grande` → sube `styles.title.fontSize` (el history funcionó).
6. Chat: `Pinta el fondo del footer de #101010` y luego `regresa el fondo del footer al de la plantilla` → `sectionBg.footer` pasa a `#101010` y luego a `null`.
7. Tienda pública (subdominio de prueba): refrescar → los cambios aplicados se ven en la tienda real.
8. Regresión WhatsApp: por el WhatsApp registrado, `ponme el color primario en azul marino` → funciona como antes; `cámbiame el ticker a "Nueva colección ya disponible"` → funciona (vocabulario nuevo por WhatsApp).
9. Logs: en el dashboard de Supabase → Functions → whatsapp-ai-agent → sin errores 5xx en las llamadas de la sesión.

- [ ] **Step 2: Registrar resultados**

Anotar en el PR/mensaje final qué pasos pasaron y cuáles no (con el error textual si algo falló). No marcar la fase como terminada con pasos en rojo.

- [ ] **Step 3: Push de la rama (sin merge)**

```bash
git push -u origin feat/disenador-ia-fase1
```

- [ ] **Step 4: Gate de copy**

Presentar a Carlos la lista de strings visibles (bienvenida del panel, placeholder, botones, toasts) para validación. Merge a `main` y deploy del frontend SOLO tras su OK. (La edge function ya está desplegada desde Task 3; es invisible para usuarios que no usen el panel.)
