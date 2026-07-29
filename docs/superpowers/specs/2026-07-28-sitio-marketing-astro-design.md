# Diseño: Sitio de marketing de TOOGO en Astro (separado de la app)

**Fecha:** 2026-07-28
**Autor:** Carlos + Claude
**Estado:** DIFERIDO — reservado como **Camino 3 (futuro)**.

> **DECISIÓN (28 jul 2026):** tras evaluar el trade-off honestamente, Carlos eligió el
> **Camino 2** para AHORA: prerenderizar/generar como estático las páginas de marketing
> **dentro de la app Vite actual** (con una herramienta SSG tipo Vike / vite-react-ssg),
> sin mover dominios ni separar el repo. Da el mismo beneficio SEO/GEO (HTML real para
> crawlers) con mucho menos riesgo y esfuerzo, apropiado para un producto que ya funciona.
>
> **Este documento (Astro, sitio aparte) queda como referencia del Camino 3**, la
> arquitectura purista a la que se puede migrar cuando el sitio de marketing crezca y
> valga la pena separarlo. Todo el diseño de aquí abajo sigue siendo válido para ese día.

## 1. Contexto y objetivo

Hoy `www.toogo.store` es una SPA (React + Vite) que se pinta con JavaScript. Los
crawlers de IA (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) no ejecutan JS, así
que el marketing dependía de un truco de "prerender por User-Agent" (edge functions
que sirven HTML distinto a los bots). Ese truco es frágil y estuvo roto (devolvía 404
a todos los crawlers).

**Objetivo:** reconstruir el sitio de marketing como un sitio **Astro (SSG)** que
genera HTML estático real. Usuarios y crawlers ven el mismo contenido, sin cloaking ni
prerender. Es la base sólida para el plan SEO/GEO (ver `project_geo_seo_plan`).

**No-objetivos (fuera de alcance de esta v1):**
- Reescribir la app (dashboard, editor visual, checkout, tiendas de tenants). La app
  actual se mantiene tal cual; solo cambia de dominio.
- Rehacer el sistema de auth o el bootstrap de tiendas. Se reutiliza el backend actual.
- Migrar las tiendas de los tenants. No se tocan.
- Clústers de contenido completos ni comparativas (esas van después; ver §4).

## 2. Arquitectura de dominios

| Host | Sirve | Proyecto Vercel | Cambio |
|---|---|---|---|
| `toogo.store`, `www.toogo.store` | Marketing + blog (Astro estático) | **nuevo** (`toogo-marketing`) | 🆕 |
| `app.toogo.store` | App: login/auth (entrada de usuarios existentes) | actual (Vite) | dominio reasignado |
| `*.toogo.store` | Tiendas de tenants (Tienda/Catalogo/dashboard del tenant) | actual (Vite) | **sin cambios** |
| dominios propios de tenant (.info, etc.) | Tiendas de tenants | actual (Vite) | **sin cambios** |

Vercel resuelve dominios específicos antes que el wildcard, así que `toogo.store`/`www`
van al proyecto Astro y el resto de subdominios (`app` + tenants) al proyecto de la app.
**Las tiendas de clientes no se ven afectadas.**

## 3. Estructura de código

- **Repo nuevo** `toogo-marketing` (Astro) → proyecto de Vercel independiente.
- La app actual (`cbeuvrin/toogo-shop-v2`) se mantiene; solo se le reasigna el dominio a
  `app.toogo.store` + `*.toogo.store`.
- **Backend compartido:** ambos front-ends usan el mismo Supabase (mismas edge functions:
  `check-subdomain-availability`, creación de cuenta, `bootstrap-complete-tenant`, RPCs de
  promo, etc.). No se duplica lógica de backend.

## 4. Páginas de la v1 (Astro, estáticas)

Todas con `<title>` único, `<meta description>` única, canonical autorreferencial (con
`www`), Open Graph/Twitter y JSON-LD renderizados **en el HTML estático** (resuelve de
raíz C1/C2/C3 del diagnóstico GEO).

- `/` — home (mensaje: "Crea tu tienda en línea gratis y manéjala desde WhatsApp").
- `/precios` — planes reales: **Gratis** y **Basic** (Premium sale después). Sin inventar precios.
- `/sobre-nosotros` — quién está detrás: **creado por Keting**. (Razón social/domicilio: pendiente
  de datos de Carlos; se agregan cuando los dé.)
- `/contacto` — email + WhatsApp (+ razón social cuando la dé).
- `/crear-tienda-con-ia` — landing carril A (title con keyword "inteligencia artificial",
  H1 con el mensaje de marca).
- `/administra-tu-tienda-por-whatsapp` — landing de la categoría propia.
- `/sube-productos-por-whatsapp` — landing carril A.
- `/tienda-desde-el-celular` — landing carril A.
- `/blog` y `/blog/[slug]` — desde Supabase (ver §6).
- Legales: `/terminos-condiciones`, `/politica-privacidad`, `/liberacion-responsabilidad`.
- `robots.txt` (con crawlers de IA) y `sitemap.xml` generados por Astro con URLs `www` y
  `lastmod` honesto.

## 5. Registro (island) y login (enlace)

- **Registro:** el botón "Crear tienda" abre el onboarding **in-situ** como una *island*
  React dentro de Astro (Astro soporta componentes React que solo cargan JS al interactuar;
  no afecta el HTML estático ni el SEO). Se rediseña la UI del onboarding (más limpio, acorde
  al refresh visual) pero **reutiliza las mismas edge functions de backend ya probadas**
  (verificar subdominio, crear cuenta, `bootstrap-complete-tenant`). El popup de la promo
  `TOOGO100` también aparece aquí (mismas RPCs `get_active_plan_promo` / `redeem_plan_promo`).
- **Login:** botón "Iniciar sesión" visible en el menú de `toogo.store` que **lleva a
  `app.toogo.store`** (donde vive la lógica de auth y el ruteo al dashboard del tenant).
  Patrón estándar de SaaS; no se embebe.

**Nota de riesgo:** el onboarding es el "camino del dinero". Se rehace solo la **UI**; la
lógica (edge functions) es la misma. El plan de implementación debe probar el flujo completo
de creación de tienda antes del cutover.

## 6. Blog

- Astro obtiene los posts **publicados** de Supabase (`blog_posts`) en tiempo de build (SSG).
- Carlos sigue editando desde el panel actual (admin). Al publicar/editar, un
  **webhook** (trigger en Supabase → Deploy Hook de Vercel) dispara una reconstrucción del
  sitio Astro (~1-2 min) y el cambio aparece. La forma de trabajar de Carlos no cambia.
- Cada post incluye JSON-LD `BlogPosting` con `dateModified` real y el contenido completo.

## 7. Diseño visual (refresh)

Se mantiene la identidad (morado `#8346C1`, mascota) pero se sube el nivel: mejores
secciones, jerarquía tipográfica, animaciones sutiles. **Antes de construir** se presentan
mockups de la dirección visual para aprobación de Carlos (posible uso del companion visual /
skill de diseño). El refresh aplica a home, landings y al onboarding embebido.

## 8. Migración / cutover (sin romper nada)

1. Construir el sitio Astro completo en una URL de preview (Vercel preview o subdominio temporal).
2. Verificar: todas las páginas (HTML estático con title/canonical/JSON-LD correctos), el
   registro (crea tienda de prueba end-to-end), el login (enlace a app), el blog (rebuild), la promo.
3. Cutover (en ventana de bajo tráfico):
   a. Reasignar `app.toogo.store` (+ `*.toogo.store`) al proyecto de la app.
   b. Poner **301** de las rutas viejas de la app en `toogo.store` (`/dashboard`, `/auth`, etc.)
      hacia `app.toogo.store/...` (las sirve el sitio Astro, que no tiene esas rutas).
   c. Cambiar `toogo.store` + `www` al proyecto Astro.
4. Enviar el sitemap nuevo en Search Console / Bing.

**Las tiendas de tenants (`*.toogo.store` y dominios propios) nunca cambian de proyecto.**

**Rollback:** si algo falla en el cutover, reasignar `toogo.store` de vuelta al proyecto de
la app restaura el estado anterior (el prerender arreglado sigue en la app como respaldo).

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper el login/registro de usuarios reales | Rehacer solo UI; backend intacto; probar end-to-end en preview antes del cutover |
| Links viejos a `toogo.store/dashboard` | 301 a `app.toogo.store` desde el sitio Astro |
| Blog desactualizado (SSG) | Webhook de rebuild al publicar |
| DNS/dominios mal asignados | Cutover en ventana controlada + rollback documentado |
| Duplicar el onboarding y que derive | La lógica vive en el backend compartido; el island solo es UI |

## 10. Criterios de éxito

- `curl` sin JS de cada página pública devuelve HTML con H1, contenido, canonical propio y JSON-LD.
- Un usuario nuevo puede crear su tienda desde `toogo.store` (island) sin salir del sitio.
- Un usuario existente encuentra "Iniciar sesión" en `toogo.store` y llega a su dashboard.
- Las tiendas de tenants siguen funcionando idénticas.
- El blog se actualiza al publicar desde el panel.
