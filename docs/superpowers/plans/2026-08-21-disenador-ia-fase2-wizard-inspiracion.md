# Diseñador IA — Fase 2: Wizard "Diséñala con IA" (captura → tema)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El comerciante sube la captura de una tienda que le gusta (o describe su estilo) y recibe 2-3 propuestas de tema completas (plantilla + colores + textos), aplicables con un click y con deshacer.

**Architecture:** Una edge function NUEVA y de solo lectura (`design-from-inspiration`) llama a Claude Sonnet con visión y un tool forzado que devuelve propuestas estructuradas, validadas contra el catálogo. El frontend (`DesignWizard`, abierto desde `TemplateSelector`) aplica la propuesta elegida client-side bajo RLS — los mismos writes que hace el editor — con snapshot previo para deshacer.

**Tech Stack:** Deno (edge function), Anthropic Messages API (`claude-sonnet-5`, visión + tool_choice forzado), React + TS + Tailwind + shadcn (Dialog/Tabs existentes), supabase-js v2.

**Spec:** `docs/superpowers/specs/2026-08-21-disenador-ia-nivel1.md`

**Prerequisito:** Fase 1 completada y mergeada (usa `TEMPLATE_IDS`, `TEMPLATE_NAMES`, `validateThemeProposal`, `ThemeProposal` de `_shared/designTools.ts`, y `takeDesignSnapshot` de `src/lib/designSnapshots.ts`).

## Global Constraints

- Rama: `feat/disenador-ia-fase2` (desde `main` ya con Fase 1). Sin merge ni deploy sin OK de Carlos.
- `design-from-inspiration` se deploya SIN `--no-verify-jwt` (queda con `verify_jwt=true`; solo la llama el dashboard con sesión).
- La edge function NO escribe en la base — solo analiza. Todo write es client-side bajo RLS.
- La imagen viaja base64 en el body, NUNCA se almacena. Máx ~4 MB, solo jpeg/png/webp.
- NO tocar `OnboardingModal.tsx` (camino del dinero). La superficie v1 es `TemplateSelector`.
- Copy: español neutro "tú"; claim permitido "diséñala con IA" / "la IA te propone temas"; PROHIBIDO "la IA crea tu tienda". Todo string visible: VALIDAR CON CARLOS antes de deploy.
- Imports de edge functions: `https://deno.land/std@0.168.0/http/server.ts` y `https://esm.sh/@supabase/supabase-js@2.57.0`.
- Commits en español.

---

### Task 1: Helpers puros de inspiración + tests

**Files:**
- Create: `supabase/functions/_shared/inspiration.ts`
- Test: `supabase/functions/_shared/inspiration.test.ts`

**Interfaces:**
- Consumes: `TEMPLATE_NAMES` de `./designTools.ts`.
- Produces (los consume Task 2):
  - `validateInspirationInput(body: {tenantId?: string; imageBase64?: string; mimeType?: string; description?: string}): string | null` — null = válido.
  - `buildInspirationPrompt(description?: string): string` — prompt de sistema completo para el analizador.
  - `ALLOWED_IMAGE_TYPES: string[]`, `MAX_IMAGE_B64 = 6_000_000`.

- [ ] **Step 1: Escribir los tests**

Contenido completo de `supabase/functions/_shared/inspiration.test.ts`:

```ts
// deno test supabase/functions/_shared/inspiration.test.ts
import { buildInspirationPrompt, validateInspirationInput } from './inspiration.ts';

function assertTrue(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test('validateInspirationInput: exige tenantId y al menos una entrada', () => {
  assertTrue(validateInspirationInput({}) !== null, 'sin tenantId debió fallar');
  assertTrue(validateInspirationInput({ tenantId: 't1' }) !== null, 'sin imagen ni descripción debió fallar');
  assertTrue(validateInspirationInput({ tenantId: 't1', description: 'velas artesanales' }) === null, 'descripción sola es válida');
});

Deno.test('validateInspirationInput: imagen requiere mime permitido y tamaño', () => {
  const img = { tenantId: 't1', imageBase64: 'aGk=', mimeType: 'image/png' };
  assertTrue(validateInspirationInput(img) === null, 'png válido rechazado');
  assertTrue(validateInspirationInput({ ...img, mimeType: 'image/gif' }) !== null, 'gif debió rechazarse');
  assertTrue(
    validateInspirationInput({ ...img, imageBase64: 'x'.repeat(6_000_001) }) !== null,
    'imagen gigante debió rechazarse',
  );
});

Deno.test('buildInspirationPrompt: incluye catálogo completo y reglas anti-copia', () => {
  const p = buildInspirationPrompt('joyería minimalista');
  for (const nombre of ['Atlántico', 'Caribe', 'Cyber', 'Nature & Earth']) {
    assertTrue(p.includes(nombre), `falta la plantilla ${nombre} en el prompt`);
  }
  assertTrue(p.includes('joyería minimalista'), 'no incorpora la descripción del usuario');
  assertTrue(p.toLowerCase().includes('no copies'), 'faltan las reglas anti-copia');
});
```

- [ ] **Step 2: Correr y ver fallar**

```bash
deno test supabase/functions/_shared/inspiration.test.ts
```
Expected: `Module not found ... inspiration.ts`.

- [ ] **Step 3: Escribir el módulo**

Contenido completo de `supabase/functions/_shared/inspiration.ts`:

```ts
// Helpers puros del wizard "Diséñala con IA". Sin imports con red para que
// `deno test` corra offline (designTools.ts tampoco tiene).
import { TEMPLATE_NAMES } from './designTools.ts';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_B64 = 6_000_000; // ≈ 4.5 MB reales

export interface InspirationInput {
  tenantId?: string;
  imageBase64?: string;
  mimeType?: string;
  description?: string;
}

/** null = entrada válida; string = mensaje de error para el usuario. */
export function validateInspirationInput(b: InspirationInput): string | null {
  if (!b?.tenantId) return 'tenantId es requerido';
  const hasImg = typeof b.imageBase64 === 'string' && b.imageBase64.length > 0;
  const hasDesc = typeof b.description === 'string' && b.description.trim().length > 0;
  if (!hasImg && !hasDesc) return 'Sube una captura o escribe una descripción';
  if (hasImg) {
    if (!ALLOWED_IMAGE_TYPES.includes(b.mimeType ?? '')) {
      return 'Formato de imagen no soportado (usa JPG, PNG o WebP)';
    }
    if (b.imageBase64!.length > MAX_IMAGE_B64) {
      return 'La imagen es muy pesada (máximo ~4 MB)';
    }
  }
  return null;
}

// Tags reales de cada plantilla (src/lib/templatesCatalog.ts) para que el
// modelo elija la base correcta según el mood de la inspiración.
const TEMPLATE_TAGS: Record<string, string> = {
  default: 'versátil, clásico',
  simple_live: 'deporte, dinámico, moderno',
  minimal: 'lujo, moda',
  fashion: 'moda, editorial, moderno',
  fashion_hero: 'moda, hero con foto grande, layout dividido',
  trendy_fashion: 'moda, elegante, premium',
  nature: 'ecológico, outdoor, limpio',
  premium_brand: 'premium, café, oscuro',
  bauhaus: 'editorial, arte, geométrico',
  cyber: 'tech, dark, neón',
};

export function buildInspirationPrompt(description?: string): string {
  const catalogo = Object.entries(TEMPLATE_NAMES)
    .map(([id, nombre]) => `- ${id} ("${nombre}"): ${TEMPLATE_TAGS[id] ?? ''}`)
    .join('\n');
  return `Eres el director de arte de TOOGO, una plataforma mexicana de tiendas en línea.
Tu trabajo: a partir de la inspiración del usuario (una captura de una tienda que le gusta y/o una descripción de su negocio), proponer 2 o 3 TEMAS distintos entre sí para SU tienda.

Catálogo de plantillas disponibles (elige templateId de esta lista, nada más):
${catalogo}

${description?.trim() ? `Descripción del usuario sobre su negocio/estilo: "${description.trim()}"\n` : ''}Reglas:
- La captura es INSPIRACIÓN de paleta, mood y estilo. NO copies textos, nombres, logos ni marcas que aparezcan en ella.
- Colores en hex #RRGGBB. background debe ser legible como fondo de página; navbar debe contrastar con el contenido.
- Las 2-3 propuestas deben sentirse diferentes (p. ej. una fiel a la inspiración, una más sobria, una más atrevida).
- announcementText y tickerText: frases cortas de venta en español neutro, escritas para la tienda del usuario (ej. "Envío gratis en pedidos desde $500"). Omítelas si no aportan.
- name: nombre corto y atractivo del tema en español. rationale: UNA frase de por qué le va a su marca.
Responde ÚNICAMENTE llamando la herramienta propose_store_themes.`;
}
```

- [ ] **Step 4: Correr tests (pasan) — incluye los de Fase 1 como regresión**

```bash
deno test supabase/functions/_shared/
```
Expected: todos los tests de `designTools.test.ts` + `inspiration.test.ts` en verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/inspiration.ts supabase/functions/_shared/inspiration.test.ts
git commit -m "feat(diseñador-ia): helpers puros del wizard de inspiración con tests"
```

---

### Task 2: Edge function `design-from-inspiration`

**Files:**
- Create: `supabase/functions/design-from-inspiration/index.ts`

**Interfaces:**
- Consumes: `validateInspirationInput`, `buildInspirationPrompt` (Task 1); `TEMPLATE_IDS`, `validateThemeProposal` (Fase 1); secreto `ANTHROPIC_API_KEY` (ya configurado para el agente).
- Produces (lo consume Task 4): endpoint POST body `{tenantId, imageBase64?, mimeType?, description?}` → respuesta `{ proposals: ThemeProposal[] }` (1 a 3 items ya validados) o `{ error: string }` con status 400/401/403/502.

- [ ] **Step 1: Escribir la función**

Contenido completo de `supabase/functions/design-from-inspiration/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { TEMPLATE_IDS, validateThemeProposal } from '../_shared/designTools.ts';
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
```

- [ ] **Step 2: Typecheck**

```bash
deno check supabase/functions/design-from-inspiration/index.ts
```
Expected: sin errores.

- [ ] **Step 3: Deploy (manteniendo verify_jwt)**

```bash
npx supabase functions deploy design-from-inspiration
```
Expected: `Deployed Functions ... design-from-inspiration`. ⚠️ SIN `--no-verify-jwt`.

- [ ] **Step 4: Smoke test con sesión real**

En la consola del navegador con el dashboard abierto (sesión de la tienda de prueba) — pegar reemplazando `TENANT_ID`:

```js
const { data, error } = await (await import('/src/integrations/supabase/client.ts')).supabase
  .functions.invoke('design-from-inspiration', {
    body: { tenantId: 'TENANT_ID', description: 'vendo velas artesanales, estilo cálido y minimalista' },
  });
console.log(error ?? data);
```
Expected: `{ proposals: [ {name, rationale, templateId, colors:{...}}, ... ] }` con 2-3 items y colores hex.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/design-from-inspiration/index.ts
git commit -m "feat(diseñador-ia): edge function design-from-inspiration (visión → temas, solo lectura)"
```

---

### Task 3: Aplicador de temas client-side

**Files:**
- Create: `src/lib/applyThemeProposal.ts`

**Interfaces:**
- Consumes: cliente `supabase`; tipo `ThemeProposal` (estructura idéntica a la del módulo compartido — se re-declara aquí porque el frontend no importa desde `supabase/functions/`).
- Produces (lo consume Task 4): `applyThemeProposal(tenantId: string, p: ThemeProposal): Promise<boolean>` y `export interface ThemeProposal`.

- [ ] **Step 1: Escribir el módulo**

Contenido completo de `src/lib/applyThemeProposal.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

// Estructura espejo de ThemeProposal en _shared/designTools.ts (el frontend
// no puede importar desde supabase/functions/) — mantener en sincronía.
export interface ThemeProposal {
  name: string;
  rationale: string;
  templateId: string;
  colors: { primary: string; secondary: string; background: string; navbar: string };
  announcementText?: string;
  tickerText?: string;
}

// Merge sobre visual_editor_data idéntico al del editor: leer, mezclar, upsert
// con el onConflict canónico.
async function mergeVisual(
  tenantId: string,
  elementType: string,
  elementId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data } = await supabase
    .from('visual_editor_data')
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('element_type', elementType)
    .eq('element_id', elementId)
    .maybeSingle();
  const current = (data?.data as Record<string, unknown>) ?? {};
  const { error } = await supabase.from('visual_editor_data').upsert(
    { tenant_id: tenantId, element_type: elementType, element_id: elementId, data: { ...current, ...patch } },
    { onConflict: 'tenant_id,element_type,element_id' },
  );
  return !error;
}

/** Aplica una propuesta completa. Devuelve false si falló el write principal. */
export async function applyThemeProposal(tenantId: string, p: ThemeProposal): Promise<boolean> {
  const { error } = await supabase
    .from('tenant_settings')
    .update({
      template_id: p.templateId,
      primary_color: p.colors.primary,
      secondary_color: p.colors.secondary,
      store_background_color: p.colors.background,
      navbar_bg_color: p.colors.navbar,
    })
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('applyThemeProposal settings:', error);
    return false;
  }
  if (p.announcementText) {
    await mergeVisual(tenantId, 'announcement', 'top_bar', { text: p.announcementText, enabled: true });
  }
  if (p.tickerText) {
    await mergeVisual(tenantId, 'ticker', 'ticker_bar', { text: p.tickerText, enabled: true });
  }
  return true;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/applyThemeProposal.ts
git commit -m "feat(diseñador-ia): aplicador de temas client-side bajo RLS"
```

---

### Task 4: Modal `DesignWizard` + botón en `TemplateSelector`

**Files:**
- Create: `src/components/dashboard3/DesignWizard.tsx`
- Modify: `src/components/dashboard3/TemplateSelector.tsx` (botón que abre el modal)

**Interfaces:**
- Consumes: endpoint de Task 2; `applyThemeProposal`/`ThemeProposal` (Task 3); `takeDesignSnapshot` (Fase 1); `TEMPLATES` de `@/lib/templatesCatalog` (thumbnails); `Dialog`/`Tabs`/`Textarea`/`Button` de `@/components/ui/*` (existen).
- Produces: `<DesignWizard open onOpenChange />`; al aplicar dispara `'toogo:design-updated'` y `loadSettings` para refrescar el dashboard.

Copy visible (VALIDAR CON CARLOS): "✨ Diséñala con IA", "Sube una captura", "Descríbela", "Úsala como inspiración: crearemos un tema propio para tu marca, no una copia.", "Proponme temas", "Aplicar este tema", "Tema aplicado. Puedes deshacerlo desde el Diseñador IA.".

- [ ] **Step 1: Escribir el modal**

Contenido completo de `src/components/dashboard3/DesignWizard.tsx`:

```tsx
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TEMPLATES } from '@/lib/templatesCatalog';
import { applyThemeProposal, type ThemeProposal } from '@/lib/applyThemeProposal';
import { takeDesignSnapshot } from '@/lib/designSnapshots';

interface DesignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const DesignWizard = ({ open, onOpenChange }: DesignWizardProps) => {
  const { currentTenantId: tenantId } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [proposals, setProposals] = useState<ThemeProposal[]>([]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Usa una imagen JPG, PNG o WebP', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'La imagen es muy pesada (máximo 4 MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageBase64(dataUrl.split(',')[1] ?? null);
      setMimeType(file.type);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!tenantId || loading) return;
    if (!imageBase64 && !description.trim()) {
      toast({ title: 'Sube una captura o describe tu estilo', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setProposals([]);
    try {
      const { data, error } = await supabase.functions.invoke('design-from-inspiration', {
        body: { tenantId, imageBase64, mimeType, description: description.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProposals(data?.proposals ?? []);
    } catch (e) {
      console.error('DesignWizard analyze:', e);
      toast({ title: 'No pude analizar la inspiración', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const apply = async (p: ThemeProposal, idx: number) => {
    if (!tenantId || applying !== null) return;
    setApplying(idx);
    // Snapshot ANTES de aplicar. Se anuncia por evento para que el botón
    // "Deshacer" del DesignChatPanel (Fase 1) también cubra este cambio —
    // si no, el toast de abajo prometería algo falso.
    const snapId = await takeDesignSnapshot(tenantId, `antes del tema "${p.name}"`);
    if (snapId) {
      window.dispatchEvent(new CustomEvent('toogo:design-snapshot', { detail: { id: snapId } }));
    }
    const ok = await applyThemeProposal(tenantId, p);
    setApplying(null);
    if (ok) {
      await loadSettings();
      window.dispatchEvent(new CustomEvent('toogo:design-updated'));
      toast({ title: 'Tema aplicado', description: 'Puedes deshacerlo desde el Diseñador IA.' });
      onOpenChange(false);
    } else {
      toast({ title: 'No se pudo aplicar el tema', variant: 'destructive' });
    }
  };

  const thumbFor = (templateId: string) => TEMPLATES.find((t) => t.id === templateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Diséñala con IA</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="captura">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="captura">Sube una captura</TabsTrigger>
            <TabsTrigger value="describe">Descríbela</TabsTrigger>
          </TabsList>

          <TabsContent value="captura" className="space-y-3">
            <label className="block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-500 hover:border-violet-400">
              {previewUrl ? (
                <img src={previewUrl} alt="Inspiración" className="mx-auto max-h-48 rounded-lg" />
              ) : (
                <>Sube la captura de una tienda que te guste (JPG/PNG/WebP, máx 4 MB)</>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <p className="text-xs text-gray-500">
              Úsala como inspiración: crearemos un tema propio para tu marca, no una copia.
            </p>
          </TabsContent>

          <TabsContent value="describe" />
        </Tabs>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Cuéntame de tu negocio y el estilo que buscas. Ej: "vendo velas artesanales, quiero algo cálido y minimalista"'
          rows={3}
        />

        <Button onClick={analyze} disabled={loading} className="w-full">
          {loading ? 'Analizando…' : 'Proponme temas'}
        </Button>

        {proposals.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {proposals.map((p, i) => {
              const tpl = thumbFor(p.templateId);
              return (
                <div key={i} className="rounded-xl border p-3">
                  {tpl?.thumbnail && (
                    <img src={tpl.thumbnail} alt={tpl.name} className="mb-2 h-24 w-full rounded-lg object-cover object-top" />
                  )}
                  <p className="font-semibold">{p.name}</p>
                  <p className="mb-2 text-xs text-gray-500">
                    Plantilla {tpl?.name ?? p.templateId} · {p.rationale}
                  </p>
                  <div className="mb-3 flex gap-1.5">
                    {[p.colors.primary, p.colors.secondary, p.colors.background, p.colors.navbar].map((c, j) => (
                      <span key={j} className="h-6 w-6 rounded-full border" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  <Button size="sm" className="w-full" disabled={applying !== null} onClick={() => apply(p, i)}>
                    {applying === i ? 'Aplicando…' : 'Aplicar este tema'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Botón en `TemplateSelector`**

En `src/components/dashboard3/TemplateSelector.tsx`:

1. Junto a los imports existentes:

```tsx
import { useState } from 'react';
import { DesignWizard } from './DesignWizard';
```
(Si `useState` ya está importado, solo agregar el import del wizard.)

2. Dentro del componente, junto a los estados existentes (`const [selectedTemplate, ...]`):

```tsx
    const [wizardOpen, setWizardOpen] = useState(false);
```

3. En el JSX, ANTES del grid que mapea `TEMPLATES.map(...)` (ancla: línea ~73), agregar:

```tsx
            <div className="mb-4 flex justify-end">
                <button
                    onClick={() => setWizardOpen(true)}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                    ✨ Diséñala con IA
                </button>
            </div>
            <DesignWizard open={wizardOpen} onOpenChange={setWizardOpen} />
```

- [ ] **Step 3: Build + prueba local**

```bash
npm run build && npm run dev
```
En el dashboard → selector de plantillas: botón "✨ Diséñala con IA" abre el modal; con solo descripción devuelve propuestas; con captura también.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard3/DesignWizard.tsx src/components/dashboard3/TemplateSelector.tsx
git commit -m "feat(diseñador-ia): wizard de inspiración (captura/descripción → temas aplicables)"
```

---

### Task 5: Verificación end-to-end y cierre

**Files:** ninguno.

- [ ] **Step 1: Checklist E2E**

1. Captura real (screenshot de una tienda ajena con paleta clara, p. ej. una tienda beige/elegante) → 2-3 propuestas con paletas coherentes con la captura y plantillas sensatas (moda → fashion/minimal/trendy_fashion).
2. Textos de las propuestas NO copian textos/marcas de la captura.
3. "Aplicar este tema" → la tienda pública cambia de plantilla y colores; anuncio/ticker actualizados si venían en la propuesta.
4. Deshacer cruzado: tras aplicar un tema, abrir el Diseñador IA (Fase 1) → el botón "↩︎ Deshacer último cambio" APARECE (el wizard anunció su snapshot por el evento `'toogo:design-snapshot'`) → pulsarlo restaura plantilla, colores, anuncio y ticker previos, y la tienda pública lo refleja.
5. Solo descripción (sin captura): "vendo refacciones de autos, estilo rudo industrial" → propone premium_brand/cyber/bauhaus o similar oscuro; nunca falla con 400.
6. Imagen de 5 MB → error claro "muy pesada" sin llamar a la API.
7. Usuario sin rol en el tenant (otra cuenta) → 403.
8. Logs de `design-from-inspiration` sin 5xx.

- [ ] **Step 2: Push de la rama (sin merge)**

```bash
git push -u origin feat/disenador-ia-fase2
```

- [ ] **Step 3: Gate de copy y de claims**

Presentar a Carlos: todos los strings del wizard + el nombre del botón. Recordatorio del spec: el claim es "diséñala con IA", nunca "la IA crea tu tienda". Merge y deploy del frontend solo tras su OK. Con su OK, esta feature habilita reabrir la conversación de marketing (`/crear-tienda-con-ia` honesta + video de 30s), en sesión aparte.
