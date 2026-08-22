# Spec: Diseñador IA — Fase 3: Marketplace de temas

**Fecha:** 2026-08-22
**Autor:** Carlos + Claude
**Estado:** Aprobado para planificar (Carlos, 22 ago). Ejecución tras el gate de E2E/copy de F1+F2.
**Plan:** `docs/superpowers/plans/2026-08-22-disenador-ia-fase3-marketplace-temas.md`

## 1. Contexto y decisión

Idea de Carlos: que los comerciantes puedan "crear su plantilla y hacerla pública o privada".
Decisión de alcance honesto: en la arquitectura actual las plantillas son componentes de
código — **crear layouts de 0 = sistema de bloques (Nivel 2), proyecto futuro**. Lo que esta
fase entrega es un **marketplace de TEMAS**: un tema = plantilla base + paleta + textos de
anuncio/ticker (exactamente la estructura `ThemeProposal` ya construida y revisada en F2).
Es 100% datos: ninguna tienda puede romperse ni inyectar código.

**Regla de copy:** decir "tema" / "estilo" / "look" — NUNCA "plantilla de 0" ni "tu propia
plantilla". Todo string visible pasa por Carlos antes de deploy.

## 2. Qué vive el comerciante

1. **Guardar mi tema**: botón en la galería de plantillas → modal con nombre + switch
   "publicarlo para la comunidad". Captura el look ACTUAL de su tienda (plantilla activa,
   4 colores globales, texto de anuncio y de ticker si existen).
2. **Mis temas**: sus temas guardados (privados y públicos), con estado
   (Privado / En revisión / Publicado), aplicar y eliminar.
3. **Temas de la comunidad**: los públicos APROBADOS de todas las tiendas, con nombre del
   autor (nombre de la tienda). "Aplicar a mi tienda" con snapshot previo → el Deshacer del
   Diseñador IA lo cubre (mismo flujo del wizard: singleton + eventos).
4. **Moderación**: un tema publicado entra "en revisión"; Carlos lo aprueba o rechaza desde
   /admin (pestaña nueva "Temas"). Rechazar lo regresa a privado.

## 3. No-objetivos (v1)

- Layouts nuevos / bloques (Nivel 2). Fotos o thumbnails custom del tema (el preview son los
  chips de color + thumbnail de la plantilla base). Likes/contadores/orden por popularidad.
- Restringir publicar por plan (decisión de negocio pendiente; v1: todos pueden).
- Editar un tema guardado (v1: eliminar y volver a guardar).

## 4. Modelo de datos

Tabla `public.design_themes`:
- `id uuid pk default gen_random_uuid()`
- `tenant_id uuid not null references tenants(id) on delete cascade` (creador)
- `author_name text not null default ''` (denormalizado del tenant al guardar — evita join a
  `tenants` bajo RLS ajena)
- `name text not null`
- `is_public boolean not null default false`
- `approved boolean not null default false` (solo relevante si is_public; listado público =
  `is_public AND approved`)
- `theme jsonb not null` — forma `StoredTheme`: `{ templateId, colors:{primary, secondary,
  background, navbar}, announcementText?, tickerText? }` (subset de ThemeProposal; name vive
  en columna)
- `created_at timestamptz default now()`

RLS:
- SELECT: `(is_public AND approved)` O miembro del tenant creador (user_roles).
- INSERT/UPDATE/DELETE: miembro del tenant creador.
- Moderación (tocar filas ajenas): NUNCA por RLS directa — vía RPC SECURITY DEFINER
  `moderate_design_theme(p_theme_id, p_action 'approve'|'reject')` con check
  `user_roles.role = 'superadmin'` (⚠️ el literal correcto del enum es `superadmin`, SIN
  guion bajo — el agente arrastra un `'super_admin'` erróneo que NO copiar). Listado de
  pendientes para /admin vía RPC `list_pending_design_themes()` (mismo check).
- Migración idempotente (drop policy if exists) y aplicada vía Management API (db push roto
  en este repo — ver ledger F1).

## 5. Reutilización (contratos existentes)

- Aplicar = `applyThemeProposal` (F2) tal cual; se arma el `ThemeProposal` desde la fila.
- Deshacer = `takeDesignSnapshot` + `setPendingSnapshot` + evento `'toogo:design-snapshot'`
  + `'toogo:design-updated'` (F1/F2) — idéntico al apply del wizard.
- Captura del look actual: lecturas client-side bajo RLS que el editor ya hace
  (tenant_settings + visual_editor_data announcement/top_bar y ticker/ticker_bar).
- Textos capturados recortados a 120 chars (mismo tope que valida el server en F2).

## 6. Criterios de éxito

1. Guardo mi tema privado → aparece en "Mis temas"; lo aplico en otra de mis tiendas de
   prueba y la viste completa; Deshacer la regresa.
2. Lo publico → estado "En revisión"; NO aparece en comunidad todavía.
3. Carlos lo aprueba en /admin → aparece en "Temas de la comunidad" con autor; otra cuenta
   (otro tenant) lo aplica con un click; su Deshacer funciona.
4. Rechazar en /admin lo regresa a privado y desaparece de la cola.
5. Un tenant NO puede leer temas privados ajenos ni modificar temas ajenos (RLS).

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Copy indeseado en anuncio/ticker de un tema público | Moderación previa de Carlos + tope 120 chars + texto plano (React escapa) |
| Basura/spam de temas públicos | approved=false por defecto; solo Carlos publica |
| Colores faltantes en tenant_settings al capturar | Fallbacks documentados a la paleta de marca |
