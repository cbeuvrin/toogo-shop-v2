# Spec: Diseñador IA — Fase 2.5: Propuestas ricas del wizard

**Fecha:** 2026-08-22
**Estado:** Aprobado por Carlos ("si", 22 ago). Plan:
`docs/superpowers/plans/2026-08-22-disenador-ia-fase2-5-propuestas-ricas.md`

## 1. Contexto

Feedback de Carlos tras probar el wizard en su E2E: *"lo que hizo fue sugerirme una de mis
plantillas"* — las propuestas solo mueven plantilla + 4 colores + 2 textos, y el resultado se
siente "mi plantilla con otros colores", no un diseño a medida.

**Decisión:** enriquecer las propuestas para que compongan también **tipografía del título
del hero, color del título y fondos por sección** — perillas que el motor ya sabe aplicar
(F1: `update_hero_text`, `set_section_background`). Mismo flujo, propuestas mucho más "mías".

## 2. Alcance

Cada propuesta (`ThemeProposal`) gana tres campos OPCIONALES:
- `heroTitleFont?: string` — token de `HERO_FONT_TOKENS` (playfair, bebas, lobster…)
- `heroTitleColor?: string` — hex `#RRGGBB`
- `sectionBackgrounds?: { hero?: string; section1?: string; section2?: string; footer?: string }` — hex

Toca cuatro capas, todas existentes:
1. `_shared/designTools.ts` — interfaz + `validateThemeProposal` (tokens/hex/keys) + tests.
2. `_shared/inspiration.ts` — el prompt guía los campos nuevos (tipografía por mood, fondos
   solo si aportan) + tests.
3. `design-from-inspiration` — `input_schema` del tool forzado con los campos (redeploy).
4. `applyThemeProposal` — aplica con la MISMA semántica del editor: merge de
   `hero/main_hero` → `styles.title.{fontFamily,color}` y `sectionBg.{...}` sin pisar lo
   demás. La card del wizard muestra la tipografía (preview "Aa" con el css real de
   `HERO_FONT_OPTIONS`) y los fondos.

Extra de producto: al aplicar un tema, el toast sugiere pedirle banners al chat (el agente ya
genera imágenes bajo demanda — por eso los banners NO van dentro del wizard).

## 3. No-objetivos

- Textos del hero en las propuestas (riesgo de copiar texto de la captura ajena; el
  comerciante quiere su propio título). Banners dentro del wizard (latencia/costo; el chat
  los hace). Fuente/color de otros nodos del hero (solo `title` en v1). Tocar el agente.

## 4. Contratos (del código real)

- Hero data: estilo del título en `styles.title` (`{fontFamily?, fontSize?, color?, ...}`);
  el TEXTO vive top-level (`title`) y NO se toca. Fondos en
  `sectionBg.{hero|section1|section2|footer}` (null = default de plantilla). Merge
  lee-mezcla-escribe con `onConflict: 'tenant_id,element_type,element_id'`.
- Tokens: `HERO_FONT_TOKENS` (designTools, _shared) y `HERO_FONT_OPTIONS`
  (`src/lib/heroFonts.ts`: `{value, label, css?}`) — el preview de la card usa `css`.
- El espejo `ThemeProposal` de `src/lib/applyThemeProposal.ts` debe quedar idéntico al de
  `_shared/designTools.ts` (nota de sincronía existente).
- El marketplace de temas (F3, plan escrito) captura/aplica `StoredTheme` — F3 podrá
  extenderse con estos campos DESPUÉS; esta fase no toca F3.

## 5. Criterios de éxito

1. Wizard con "vendo velas artesanales, cálido y minimalista" → alguna propuesta trae
   tipografía (p. ej. playfair) y fondos; la card lo muestra; aplicar deja el título del
   hero con esa fuente/color y las secciones con esos fondos — y el modal manual del editor
   muestra exactamente esos valores (paridad).
2. Deshacer restaura fuente, color y fondos anteriores (el snapshot ya captura todo el hero).
3. Propuestas con font/hex/sección inválidos se filtran server-side (tests).
4. Tests previos (18) siguen en verde.

## 6. Reglas

Copy nuevo (tip de banners, línea de tipografía en la card) VALIDAR CON CARLOS. Español
neutro "tú". Migraciones: no aplica (sin cambios de schema).
