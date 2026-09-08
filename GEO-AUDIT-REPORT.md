# Auditoría GEO/SEO — www.toogo.store
**Fecha:** 2026-09-08 · **Contexto:** GSC reporta 1 click · **Método:** 5 agentes en paralelo (visibilidad IA, técnico, contenido, schema, plataformas) + verificación manual de cada hallazgo crítico

## Score compuesto: **30/100**

| Categoría | Peso | Score | Nota |
|---|---|---|---|
| Citabilidad y visibilidad IA | 25% | 45 | Acceso de crawlers perfecto; contenido casi no citable |
| Autoridad de marca | 20% | ~5 | Cero menciones externas (Reddit, YouTube, Wikipedia, G2/Capterra, listicles) |
| Contenido y E-E-A-T | 20% | 29 | 5 de 6 posts son relleno IA; el diferenciador (WhatsApp) sin artículo |
| Técnico | 15% | 28 | Cadena de bugs de prerender que anula la indexación |
| Datos estructurados | 10% | 46 | @graph bueno en home; FAQ invisible para bots |
| Plataformas IA | 10% | 29 | AIO 27 · ChatGPT 44 · Perplexity 34 · Gemini 17 · Bing 25 |

**Diagnóstico en una frase:** el sitio tiene el acceso abierto (robots.txt impecable) pero lo que se les sirve a los bots está roto en cadena — Google literalmente no puede indexar limpia NI UNA URL salvo los 6 posts del blog, y fuera del dominio la marca no existe. El "1 click" no es un misterio: es el resultado exacto de este estado.

## Hallazgos críticos (verificados a mano)

1. **La home se sirve a Googlebot como `text/plain` + `nosniff`** → Google recibe la portada como texto plano, no como HTML: ni canonical, ni JSON-LD, ni links. Causa: la versión DESPLEGADA de `store-seo-handler` es vieja (el deploy quedó pendiente desde el 31 jul); el código local ya manda `text/html`.
2. **Canonical de la home apunta a `/store-seo-handler`** (todos los bots: Googlebot, GPTBot, PerplexityBot, bingbot). Además `/store-seo-handler` responde 200 con canonical de vuelta a la home → loop circular. Fix local: canonical a `/` cuando el path no es una página conocida + deploy.
3. **5 de 12 URLs del sitemap sirven el cascarón vacío de la SPA** a los bots (`/blog`, `/ayuda/configurar-pagos`, 3 legales): title/canonical de la home, `lang="en"`, 0 palabras. Para cualquier crawler no existen. Causa: el prerender solo cubre `/` y `/blog/:slug` en vercel.json + canonical fijo en index.html.
4. **`llms.txt` es falso**: responde 200 pero sirve el shell de React (el catch-all de vercel.json lo captura). Igual `llms-full.txt`. Un archivo de texto real es gratis y hoy no existe.
5. **Cero entidad externa**: TOOGO no aparece en ninguno de los artículos comparativos que los LLMs citan para "plataformas de tienda online en México" (ahí están Tiendanube, Mitienda, TiendaDA). Sin fichas en Capterra/G2/Trustpilot, sin Reddit/YouTube, sameAs solo Facebook. Los LLMs no citan lo que nadie más menciona.

## Otros hallazgos
- Soft-404: cualquier URL inventada responde 200 con el shell del home.
- Redirect no-www → www en 2 saltos, el segundo 307 (temporal) en vez de 308/301.
- FAQPage solo existe en el cliente; ningún bot lo ve. `SoftwareApplication` sin `aggregateRating` (requisito de Google para el rich result).
- Home prerenderizada: ~90 palabras, 1 H1 + 3 párrafos. Casi nada que citar.
- Post "Toogo vs Shopify": comparación de comisiones imprecisa — riesgo reputacional ante verificación de IA; reescribir u ocultar.
- El post "Guía Completa…" es el modelo a seguir: FAQ real, precios exactos, pasos — citabilidad 75/100.
- Blog congelado desde nov 2025. Autoría siempre "Organization", nunca persona.
- Bing sin verificar + sin IndexNow (Bing alimenta ChatGPT y Copilot).

## Plan priorizado

**Fase 1 — Fixes técnicos (código nuestro, ~1 día, desbloquea TODO lo demás):**
1. Deploy de `store-seo-handler` (arregla content-type) + canonical defensivo a `/`.
2. Prerender para `/blog` (listado), `/ayuda/configurar-pagos` y legales — extender MKT_PAGES + rewrites en vercel.json. `/store-seo-handler` directo → 404 o redirect 301 a `/`.
3. `llms.txt` y `llms-full.txt` reales (archivos estáticos en `public/` + exclusión en el catch-all, como robots.txt).
4. Quitar el canonical fijo de index.html (o hacerlo dinámico por ruta en SEOHead).
5. Enriquecer la home prerenderizada: H2s, bloque de preguntas frecuentes (con FAQPage en el JSON-LD), tabla de precios, cifras concretas. **Copy lo valida Carlos antes de publicar.**
6. Redirect no-www en 1 salto 308. Soft-404 → los paths desconocidos con `X-Robots-Tag: noindex` o 404 real para bots.

**Fase 2 — Señales y plataformas (~1 semana, mayormente trámites):**
7. Verificar Bing Webmaster Tools + IndexNow (alimenta ChatGPT/Copilot).
8. En GSC: pedir reindexación de la home y las URLs arregladas tras la Fase 1.
9. Crear fichas: Capterra, G2, Trustpilot, Product Hunt; ampliar `sameAs` (Instagram, TikTok, YouTube, LinkedIn si existen).
10. Reescribir o despublicar "Toogo vs Shopify"; corregir datos.

**Fase 3 — Contenido y menciones (continuo, lo que mueve la aguja de verdad):**
11. 10 artículos priorizados (del reporte de contenido): empezar por "Cómo vender por WhatsApp en México" (el diferenciador, sin competencia directa), "Tienda online gratis sin tarjeta", "Cobrar con OXXO/SPEI", comparativa honesta Shopify/Tiendanube, 1 caso de estudio real con un comerciante.
12. Conseguir menciones externas: aparecer en los listicles que los LLMs ya citan (outreach), Reddit/comunidades de emprendedores MX, YouTube.
13. Cadencia de blog quincenal, autor con nombre y bio.

## Reportes detallados
- `scratchpad/geo-technical.md` — tabla URL por URL
- `scratchpad/geo-ai-visibility.md` — citabilidad por pasaje + menciones
- `scratchpad/geo-content.md` — análisis post por post + plan de 10 artículos
- `scratchpad/geo-schema.md` — JSON-LD corregido listo para pegar
- `scratchpad/geo-platforms.md` — plan por plataforma
