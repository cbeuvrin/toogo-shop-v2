# Spec: Diseñador IA — Nivel 1 (IA que opera el sistema de diseño)

**Fecha:** 2026-08-21
**Autor:** Carlos + Claude
**Estado:** Aprobado para planificar. Dos planes de implementación:
- `docs/superpowers/plans/2026-08-21-disenador-ia-fase1-motor-y-chat.md`
- `docs/superpowers/plans/2026-08-21-disenador-ia-fase2-wizard-inspiracion.md`

## 1. Contexto y decisión

Carlos evaluó Base44 (crea apps con IA generando código libre). Su punto débil:
cada app generada es única, así que el usuario también debe generar y mantener
su dashboard, y nada garantiza que no se rompa. TOOGO es lo opuesto: todas las
tiendas comparten el mismo modelo de datos, por eso el dashboard "for dummies"
es uno solo y el editor visual nunca rompe una tienda.

**Decisión: la IA opera el sistema de diseño existente (escribe DATOS), nunca
genera código por tenant.** Todo lo que la IA toque queda editable a mano en el
editor visual (paridad editor↔tienda) y el dashboard no se entera.

El embrión ya existe: `whatsapp-ai-agent` (cerebro Claude Haiku 4.5, 15 tools)
ya escribe `visual_editor_data` (banners) y `tenant_settings` (colores, logo),
y su auth ya acepta usuarios autenticados del dashboard con rol en el tenant
(Path B). Este proyecto amplía ese cerebro y le da dos superficies nuevas.

## 2. Alcance

**Fase 1 — Motor de diseño + chat en el dashboard (plan 1):**
- Módulo compartido de herramientas de diseño (`_shared/designTools.ts`) que
  cubre el vocabulario completo del editor: plantilla, anuncio, ticker, text
  banner, testimonios, textos del hero (texto/color/fuente/tamaño), fondos de
  sección. Se suma a las tools existentes (colores globales, banners, imágenes).
- Panel de chat "Diseñador IA" dentro del editor visual del dashboard, que
  llama a `whatsapp-ai-agent` con el JWT del usuario.
- Deshacer: snapshot del estado visual antes de cada instrucción
  (tabla `design_snapshots`), restauración client-side vía RLS.
- Bonus automático: el bot de WhatsApp gana el mismo vocabulario (mismo
  cerebro) — "cámbiame el título del hero a dorado" funciona por WhatsApp.

**Fase 2 — Wizard "Diséñala con IA" (plan 2):**
- Edge function `design-from-inspiration` (solo LECTURA): recibe captura de una
  tienda que le gusta al usuario y/o una descripción → Claude Sonnet con visión
  → 2-3 propuestas de tema **estructuradas** (plantilla + 4 colores + textos
  opcionales), validadas contra el catálogo.
- Modal `DesignWizard` accesible desde el selector de plantillas del dashboard
  (botón "✨ Diséñala con IA"): subir captura o describir → ver propuestas →
  aplicar (con snapshot para deshacer).
- **NO se toca `OnboardingModal` en v1** — es el camino del dinero. Integrarlo
  al onboarding es una fase posterior, cuando el wizard esté probado.

## 3. No-objetivos

- Generación de código libre por tenant (nivel Base44). Nunca.
- Sistema de bloques/secciones componibles (Nivel 2 del análisis) — proyecto
  aparte, futuro.
- Editar el hero shape/hamburguesa/imágenes por dispositivo desde la IA (v1
  cubre textos, colores, fuentes y fondos; el resto queda en el editor manual).
- Tocar `chat-assistant` (widget del cliente final) — no tiene relación.
- Cambiar el modelo del agente (sigue Haiku 4.5).

## 4. Contratos clave (del código real)

- `visual_editor_data` (tenant_id, element_type, element_id, data jsonb),
  upsert con `onConflict: 'tenant_id,element_type,element_id'`. Pares
  canónicos: hero/main_hero, logo/main_logo, announcement/top_bar,
  contact/store_contact, ticker/ticker_bar, text_banner/main_text_banner,
  testimonials/main_testimonials, featured_products/featured_grid(+_2),
  banner/<id> con `data.sort`.
- Hero: textos de eyebrow/title/message/cta1/cta2 en campos top-level
  (`eyebrowText`, `title`, `message`, `cta1Label`, `cta2Label`); su estilo en
  `styles[key]`; los demás nodos guardan su texto en `styles[key].text`.
  Fondos por sección en `sectionBg.{hero|section1|section2|footer}`.
- `tenant_settings`: `template_id`, `primary_color`, `secondary_color`,
  `store_background_color`, `navbar_bg_color`, `logo_url`.
- Plantillas (id → nombre): default=Atlántico, simple_live=Pacífico,
  minimal=Mediterráneo, fashion=Adriático, fashion_hero=Índico,
  trendy_fashion=Caribe, nature=Nature & Earth, premium_brand, bauhaus, cyber.
- Fuentes del hero (tokens de `src/lib/heroFonts.ts`): default, sans, serif,
  mono, poppins, montserrat, oswald, bebas, playfair, lobster.
- RLS: los miembros del tenant ya escriben `visual_editor_data` y
  `tenant_settings` desde el cliente (así guarda el editor) → snapshot/restore
  y aplicación de temas pueden ser client-side sin service role.

## 5. Seguridad

- `whatsapp-ai-agent` mantiene `verify_jwt=true` y su doble vía de auth
  (secreto interno del webhook / usuario con `user_roles` en el tenant). El
  panel usa la vía B con `supabase.functions.invoke` (manda el JWT solo).
- `design-from-inspiration`: mismo patrón de auth vía B; **no escribe nada**
  (el apply es client-side bajo RLS). Imagen viaja como base64 en el body
  (máx ~4 MB, jpeg/png/webp); no se almacena.
- `design_snapshots` con RLS: solo miembros del tenant (ALL).

## 6. Criterios de éxito

1. En el editor: "pon la barra de anuncio 'Envío gratis desde $500' con fondo
   negro" → se aplica, el preview lo muestra, y el modal manual del editor
   muestra exactamente esos valores (paridad).
2. "Deshacer" restaura el estado anterior completo (settings + elementos).
3. Por WhatsApp: "cámbiame la plantilla a Caribe" funciona (mismo cerebro).
4. Wizard: captura de una tienda ajena → 2-3 propuestas coherentes → aplicar
   viste la tienda completa; deshacer la regresa.
5. El flujo actual del bot de WhatsApp (productos, pedidos, imágenes) queda
   intacto (regresión manual).

## 7. Reglas de proyecto

- **Todo copy visible al usuario lo valida Carlos antes del deploy** (regla
  vigente desde el incidente `/crear-tienda-con-ia`). Los planes marcan cada
  string con "VALIDAR CON CARLOS".
- Español neutro con "tú" (nunca voseo).
- No prometer "la IA crea tu tienda". El claim honesto: "dile a la IA cómo
  quieres tu tienda y ella la cambia" / "diséñala con IA".
- Marketing: no citar número exacto de plantillas.
