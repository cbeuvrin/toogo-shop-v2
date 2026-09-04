# Diseñador IA — Fase 2.5: Propuestas ricas del wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las propuestas del wizard componen también tipografía y color del título del hero y fondos por sección — y dejan de sentirse "mi plantilla con otros colores".

**Architecture:** Tres campos opcionales nuevos en `ThemeProposal` atraviesan las capas existentes: validación compartida → prompt/schema de la edge fn (redeploy) → aplicador client-side (merge del hero con la semántica exacta del editor) → card del wizard con preview tipográfico.

**Tech Stack:** Deno (_shared + edge fn), Anthropic tool forzado, React + TS.

**Spec:** `docs/superpowers/specs/2026-08-22-wizard-propuestas-ricas.md`

## Global Constraints

- Rama: `feat/disenador-ia-fase2-5` desde `main` (que ya contiene F1+F2). Sin merge/deploy de frontend sin OK de Carlos; el redeploy de `design-from-inspiration` sí procede (Task 2, mismo criterio adjudicado en F1/F2: aditivo e invisible sin la UI nueva).
- Campos EXACTOS (los usan las 4 capas): `heroTitleFont?: string` (token de `HERO_FONT_TOKENS`), `heroTitleColor?: string` (hex `#RRGGBB`), `sectionBackgrounds?: { hero?: string; section1?: string; section2?: string; footer?: string }` (hex).
- Semántica del hero (paridad con el editor): estilo en `styles.title` mergeado sin pisar otros campos; `sectionBg` mergeado por clave; el texto top-level `title` NO se toca. Upserts con `onConflict: 'tenant_id,element_type,element_id'`.
- `deno` en `/opt/homebrew/bin/deno`. Redeploy SIN `--no-verify-jwt`.
- Copy nuevo en español neutro "tú", marcado VALIDAR CON CARLOS. Commits en español.

---

### Task 1: Capa compartida — interfaz, validación y prompt (+tests)

**Files:**
- Modify: `supabase/functions/_shared/designTools.ts` (interfaz `ThemeProposal` + `validateThemeProposal`)
- Modify: `supabase/functions/_shared/inspiration.ts` (`buildInspirationPrompt`)
- Test: `supabase/functions/_shared/designTools.test.ts`, `supabase/functions/_shared/inspiration.test.ts`

**Interfaces:**
- Consumes: `HERO_FONT_TOKENS` y `SECTION_KEYS` ya definidos en `designTools.ts` (SECTION_KEYS es const de módulo: `['hero','section1','section2','footer']`); `HEX` regex de módulo.
- Produces: `ThemeProposal` con los 3 campos opcionales; `validateThemeProposal` los valida; el prompt los pide. Los consumen Tasks 2-3.

- [ ] **Step 1: Tests primero (fallan)**

En `designTools.test.ts`, dentro del test existente `validateThemeProposal: valida catálogo y colores`, añadir al final:

```ts
  const rico = {
    ...ok,
    heroTitleFont: 'playfair',
    heroTitleColor: '#FFD700',
    sectionBackgrounds: { footer: '#101010', hero: '#FFF8EE' },
  };
  assertEq(validateThemeProposal(rico), null, 'propuesta rica válida rechazada');
  assertTrue(validateThemeProposal({ ...ok, heroTitleFont: 'comic-sans' }) !== null, 'font inválida aceptada');
  assertTrue(validateThemeProposal({ ...ok, heroTitleColor: 'dorado' }) !== null, 'heroTitleColor inválido aceptado');
  assertTrue(
    validateThemeProposal({ ...ok, sectionBackgrounds: { sidebar: '#101010' } }) !== null,
    'sección inválida aceptada',
  );
  assertTrue(
    validateThemeProposal({ ...ok, sectionBackgrounds: { footer: 'negro' } }) !== null,
    'fondo no-hex aceptado',
  );
```

En `inspiration.test.ts`, dentro del test `buildInspirationPrompt: incluye catálogo completo y reglas anti-copia`, añadir al final:

```ts
  assertTrue(p.includes('heroTitleFont'), 'falta la guía de tipografía del hero');
  assertTrue(p.includes('playfair'), 'falta la lista de tokens de fuente');
  assertTrue(p.includes('sectionBackgrounds'), 'falta la guía de fondos por sección');
```

Correr `deno test supabase/functions/_shared/` → los asserts nuevos FALLAN (RED).

- [ ] **Step 2: Interfaz + validación en `designTools.ts`**

En `export interface ThemeProposal`, después de `tickerText?: string;` añadir:

```ts
  heroTitleFont?: string;
  heroTitleColor?: string;
  sectionBackgrounds?: { hero?: string; section1?: string; section2?: string; footer?: string };
```

En `validateThemeProposal`, después del loop de `announcementText`/`tickerText` y antes del `return null;` añadir:

```ts
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
```

- [ ] **Step 3: Prompt en `inspiration.ts`**

En `buildInspirationPrompt`, importar el token list: la línea de import pasa a
`import { TEMPLATE_NAMES, HERO_FONT_TOKENS } from './designTools.ts';`
Y en el bloque `Reglas:` del template string, después de la línea de colores hex, añadir:

```text
- heroTitleFont: elige UNA tipografía para el título de la portada acorde al mood, de esta lista exacta: ${HERO_FONT_TOKENS.join(', ')} (playfair=elegante/editorial, bebas=impacto/deportivo, lobster=script/artesanal, mono=tech, oswald=condensada moderna). heroTitleColor en hex solo si mejora el contraste con el fondo del hero.
- sectionBackgrounds: fondos por sección (hero, section1, section2, footer) en hex #RRGGBB — inclúyelos SOLO si el look lo pide (p. ej. footer oscuro en un tema nocturno). Omite las secciones que no cambien.
```

- [ ] **Step 4: GREEN**

```bash
deno test supabase/functions/_shared/
```
Expected: 18 passed (asserts extra en tests existentes), salida limpia.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/
git commit -m "feat(diseñador-ia): ThemeProposal con tipografía de hero y fondos por sección (validación + prompt)"
```

---

### Task 2: Edge fn — schema del tool forzado + redeploy

**Files:**
- Modify: `supabase/functions/design-from-inspiration/index.ts`

**Interfaces:**
- Consumes: `HERO_FONT_TOKENS` (importable desde `../_shared/designTools.ts` — el archivo ya importa `TEMPLATE_IDS, validateThemeProposal` de ahí: ampliar ese import).
- Produces: propuestas que pueden traer los 3 campos nuevos (la validación server-side de Task 1 ya los filtra).

- [ ] **Step 1: Ampliar el import**

Ancla: `import { TEMPLATE_IDS, validateThemeProposal } from '../_shared/designTools.ts';`
→ `import { HERO_FONT_TOKENS, TEMPLATE_IDS, validateThemeProposal } from '../_shared/designTools.ts';`

- [ ] **Step 2: Ampliar el input_schema**

En `proposeTool.input_schema.properties.proposals.items.properties`, después de `tickerText: { type: 'string' },` añadir:

```ts
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
```

- [ ] **Step 3: Verificar y redeploy**

```bash
deno check supabase/functions/design-from-inspiration/index.ts
npx supabase functions deploy design-from-inspiration
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/design-from-inspiration" -H "Content-Type: application/json" -d '{}'
```
Expected: check sin errores; deploy OK; curl `401`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/design-from-inspiration/index.ts
git commit -m "feat(diseñador-ia): el analizador propone tipografía de hero y fondos por sección"
```

---

### Task 3: Aplicador + card del wizard

**Files:**
- Modify: `src/lib/applyThemeProposal.ts` (espejo + apply del hero)
- Modify: `src/components/dashboard3/DesignWizard.tsx` (preview tipográfico + fondos + tip de banners)

**Interfaces:**
- Consumes: campos nuevos de Task 1 (nombres EXACTOS de Global Constraints); `HERO_FONT_OPTIONS` de `@/lib/heroFonts` (`{value, label, css?}[]`) para el preview.
- Produces: aplicar una propuesta rica escribe `hero/main_hero` (`styles.title` + `sectionBg`) con paridad de editor; la card muestra fuente y fondos.

- [ ] **Step 1: Espejo de la interfaz en `applyThemeProposal.ts`**

En `export interface ThemeProposal` (el espejo), después de `tickerText?: string;` añadir EXACTAMENTE los 3 campos de Global Constraints (mismo texto que en Task 1 Step 2).

- [ ] **Step 2: Aplicar el hero**

En `applyThemeProposal`, después del bloque de `tickerText` y antes del `return true;` añadir:

```ts
  // Tipografía/color del título y fondos por sección: misma semántica que el
  // editor (handleSaveHeroElement / handleSaveSectionBg): merge de
  // hero/main_hero sin pisar el resto; el TEXTO top-level no se toca.
  if (p.heroTitleFont || p.heroTitleColor || p.sectionBackgrounds) {
    const { data } = await supabase
      .from('visual_editor_data')
      .select('data')
      .eq('tenant_id', tenantId)
      .eq('element_type', 'hero')
      .eq('element_id', 'main_hero')
      .maybeSingle();
    const current = (data?.data as Record<string, unknown>) ?? {};
    const styles = (current.styles as Record<string, Record<string, unknown>>) ?? {};
    const title = {
      ...(styles.title ?? {}),
      ...(p.heroTitleFont ? { fontFamily: p.heroTitleFont } : {}),
      ...(p.heroTitleColor ? { color: p.heroTitleColor } : {}),
    };
    const cleanBgs = Object.fromEntries(
      Object.entries(p.sectionBackgrounds ?? {}).filter(([, v]) => typeof v === 'string'),
    );
    const merged = {
      ...current,
      styles: { ...styles, title },
      sectionBg: { ...((current.sectionBg as Record<string, unknown>) ?? {}), ...cleanBgs },
    };
    await supabase.from('visual_editor_data').upsert(
      { tenant_id: tenantId, element_type: 'hero', element_id: 'main_hero', data: merged },
      { onConflict: 'tenant_id,element_type,element_id' },
    );
  }
```

- [ ] **Step 3: Card del wizard — preview tipográfico y fondos**

En `DesignWizard.tsx`:

1. Import: `import { HERO_FONT_OPTIONS } from '@/lib/heroFonts';`
2. En la card de cada propuesta, DESPUÉS del div de los color chips (y antes del bloque de announcement/ticker), añadir:

```tsx
                  {p.heroTitleFont && (() => {
                    const f = HERO_FONT_OPTIONS.find((o) => o.value === p.heroTitleFont);
                    return f ? (
                      <p
                        className="mb-2 truncate text-lg leading-tight"
                        style={{ fontFamily: f.css, color: p.heroTitleColor || undefined }}
                      >
                        Aa · {f.label}
                      </p>
                    ) : null;
                  })()}
                  {p.sectionBackgrounds && Object.keys(p.sectionBackgrounds).length > 0 && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-400">
                      fondos
                      {Object.entries(p.sectionBackgrounds).map(([k, c]) => (
                        <span key={k} className="h-4 w-4 rounded border" style={{ backgroundColor: c }} title={`${k}: ${c}`} />
                      ))}
                    </div>
                  )}
```

3. Tip de banners (VALIDAR CON CARLOS): en el toast de éxito de `apply()`, la rama con `snapId` pasa a:

```ts
          ? 'Puedes deshacerlo desde el Diseñador IA. ¿Banners a juego? Pídeselos al chat: «genera un banner para mi tienda».'
```
(La rama sin `snapId` queda igual.)

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/applyThemeProposal.ts src/components/dashboard3/DesignWizard.tsx
git commit -m "feat(diseñador-ia): aplicar y mostrar tipografía de hero y fondos en las propuestas"
```

---

### Task 4: E2E humano (Carlos) y gate de copy

**Files:** ninguno.

- [ ] **Step 1: Checklist**

1. Wizard con "vendo velas artesanales, estilo cálido y minimalista" → alguna propuesta trae "Aa · Playfair…" (u otra fuente coherente) y chips de fondos.
2. Aplicar → el título del hero cambia de fuente/color y los fondos de sección cambian; abrir los modales manuales del editor (título del hero, fondo de sección) → muestran EXACTAMENTE esos valores.
3. ↩︎ Deshacer → fuente, color y fondos vuelven.
4. Wizard con captura de una tienda oscura/neón → propone fondos oscuros y fuente acorde.
5. Los 18 tests y el flujo previo del wizard (colores/textos) siguen bien.

- [ ] **Step 2: Gate de copy** — el tip de banners y la línea "Aa · {fuente}".

- [ ] **Step 3: Push (merge tras OK)**

```bash
git push -u origin feat/disenador-ia-fase2-5
```
