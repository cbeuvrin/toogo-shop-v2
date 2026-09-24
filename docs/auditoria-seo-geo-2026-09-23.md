# Auditoría SEO + visibilidad en IA — toogo.store
**23 de septiembre de 2026.** Todo verificado en vivo con peticiones reales. Lo no verificable está marcado.

## Resumen

Hay **dos problemas distintos** que se estaban confundiendo en uno solo:

1. **Bugs de código** que hacen que Google vea el sitio roto. Se arreglan en días.
2. **Cero autoridad externa + colisión de marca.** No se arregla con código. Es el techo real.

El trabajo técnico previo (prerender, robots.txt, llms.txt, canonicals, schema) está bien hecho.
Lo están saboteando tres fallos concretos.

---

## A. BUGS VERIFICADOS (código)

### A1. `/precios` devuelve 404 a todos los bots — CRÍTICO

```
Googlebot  /precios -> HTTP 404 + X-Robots-Tag: noindex
GPTBot     /precios -> HTTP 404 + X-Robots-Tag: noindex
Chrome     /precios -> HTTP 200
```

La página nunca existió como ruta. Para humanos "Precios" es un ancla (`#precios`) en la portada.
Pero el HTML para robots la publica como URL real en dos sitios:

- Nav de **todas** las páginas prerenderizadas: `<a href="https://www.toogo.store/precios">Precios</a>`
- Schema: `SoftwareApplication.offers.url = "https://www.toogo.store/precios"`

Causa raíz: `middleware.ts:31` — `MKT_BOT_PATHS` no incluye `/precios`, así que cae en la
regla anti-soft-404 de la línea 148.

Consecuencias: enlace roto en el nav global, oferta declarada apuntando a 404, y **ninguna IA
puede responder cuánto cuesta TOOGO**.

### A2. `/soporte` entrega la cáscara vacía de React — ALTO

Está en `MKT_BOT_PATHS` pero la edge function no la contempla. Googlebot recibe:
- 3 palabras ("Preparando tu tienda")
- Sin schema, sin canonical
- **Con el título de la portada** → duplicado

### A3. URLs con barra final: duplicados 200 sin canonical — ALTO

```
/blog/                   -> 200, cáscara SPA, título de la portada, SIN canonical
/terminos-condiciones/   -> 200, igual
/politica-privacidad/    -> 200, igual
/blog/page/2             -> 200, igual
```

No hay redirección 308 de `/ruta/` a `/ruta`. Son candidatos a indexarse como duplicados.

### A4. `lastmod` del sitemap congelado — ALTO

| URL | lastmod declarado | Realidad |
|---|---|---|
| `/` | 2026-07-28 | `last-modified` real: 23-sep-2026 |
| `/blog` | 2026-07-28 | se le añadió un post el 08-sep |

Google usa `lastmod` para priorizar el rastreo. Un valor que no se mueve cuando la página sí
cambia entrena a Google a no volver. **Prueba de que el índice está viejo:** el buscador
todavía muestra el título anterior ("Crea tu Tienda Online Gratis en 5 Minutos | TOOGO México").

### A5. Páginas huérfanas — MEDIO

Nunca enlazadas desde ningún HTML que el bot pueda ver:
`/terminos-condiciones`, `/politica-privacidad`, `/liberacion-responsabilidad`, `/ayuda/configurar-pagos`.
Solo existen en el sitemap y en llms.txt. Son las primeras que Google descarta.

### A6. IndexNow no implementado — MEDIO

`/indexnow.txt` y `/BingSiteAuth.xml` devuelven la cáscara del SPA, no una clave.
Bing es el índice del que dependen ChatGPT con búsqueda y Copilot.

### A7. Agentes de IA con UA de navegador ven 3 palabras — MEDIO

```
Artículo del blog con UA de GPTBot     -> 702 palabras
Artículo del blog con UA de navegador  ->   3 palabras ("Preparando tu tienda")
```

Afecta a ChatGPT Atlas, Perplexity Comet y similares que navegan con identidad de navegador
sin ejecutar JavaScript. No afecta a personas reales (su navegador sí ejecuta JS).

### A8. Metadatos falsos — MEDIO

- `og:image` declara 1200×630. El archivo real mide **1080×1080**. Rompe el recorte en
  WhatsApp, Facebook y LinkedIn, y queda por debajo del mínimo de Google (1200 px).
- `twitter:site = "@toogo_store"` en los 6 artículos. **`x.com/toogo_store` devuelve 404.**

### A9. Schema: defectos estructurales — MEDIO

- `SoftwareApplication` **sin `@id`** → cada URL crea una entidad TOOGO duplicada.
- `sameAs` de Organization tiene **una sola URL** (Facebook). Falta el canal de YouTube,
  que sí existe: `youtube.com/@toogostore` responde 200, título "Toogo Store", 1 video,
  descripción vacía.
- Sin `BreadcrumbList` en ninguna página. Es el único resultado enriquecido de la lista
  que Google muestra sin restricciones.
- `publisher` repetido inline en los artículos en vez de referenciar `#organization`.

### A10. Restos de WordPress con 403 — BAJO

`/index.php` y `/wp-json/wp/v2/posts` devuelven **403**. Google lo reporta como "bloqueada"
y reintenta. Con 404 o 410 lo cierra. (El resto ya se arregló: `/feed`, `/wp-sitemap.xml` dan 404.)

### A11. Sitemap del apex en GSC es una redirección — BAJO

`toogo.store/sitemap.xml` → 308 hacia www. Tenerlo enviado en GSC genera ruido.
Borrar esa entrada y dejar solo la de www.

---

## B. EL PROBLEMA QUE NO SE ARREGLA CON CÓDIGO

### B1. El nombre "Toogo" ya está ocupado — CRÍTICO ESTRATÉGICO

**TOOGONET**, software francés para agencias de viajes, ocupa la entidad "Toogo":

| Directorio | Ficha "Toogo" |
|---|---|
| Capterra global y **Capterra México** | Software de viajes, 4,8/5, 35 reseñas |
| ComparaSoftware | Software de viajes |
| Software Advice | Software de viajes |
| Appvizer | Software de viajes |

Más **Toogo Rides** (Marruecos) y **Too Good To Go** (con artículo en Wikipedia).

Cuando un modelo resuelve "Toogo", gana el software de viajes.

**CORRECCIÓN A DOCUMENTO PREVIO:** `docs/seo-fase2-fichas-directorios.md` recomendaba
registrarse en Capterra y ComparaSoftware. Ese consejo era incorrecto: las fichas están
tomadas. Hay que usar nombre calificado ("TOOGO México" / "TOOGO Store") y priorizar
**G2 y Product Hunt**, que sí están libres (verificado).

### B2. Cero menciones externas — CRÍTICO ESTRATÉGICO

Verificado plataforma por plataforma:

| Plataforma | Estado |
|---|---|
| Wikipedia ES y EN | Ausente (API consultada) |
| Wikidata | Sin entidad |
| G2 | Libre |
| Product Hunt | Libre |
| YouTube | Canal existe, 1 video, sin descripción |
| Reddit / foros MX | Sin menciones |
| LinkedIn | Página con 2 seguidores, sin descripción |
| Listicles del sector | **Ausente de todos** |
| Trustpilot | No verificable (403 antibot) |

El único sitio de internet que habla de TOOGO es toogo.store.

Los listicles que dominan "mejores plataformas para vender por WhatsApp México" son de
empresas pequeñas y alcanzables: itpago.com, getyato.com, mareaalcalina.com, bling.mx,
whataform.com, vercatalogo.com. Ninguno está posicionado en "administrar por WhatsApp".

---

## C. CONTENIDO

4 de los 6 artículos son relleno genérico sin editar. Señales concretas:

- Dos artículos abren con la misma plantilla: *"En el dinámico panorama del comercio
  electrónico..."* / *"En el dinámico panorama empresarial actual..."*
- Títulos con minúsculas sin corregir: *"Conclusión: toogo, el futuro del ecommerce en américa"*
- Cinco de los seis se publicaron en 4 días de noviembre de 2025 y nunca se tocaron.
- **Cero citas externas** en ~8.500 palabras.
- **Ningún autor persona.** Los 6 firman `author: Organization / TOOGO`.

**Riesgo de veracidad:** `la-ia-en-el-ecommerce-toogo` describe en futuro funciones que no
existen (precios dinámicos, predicción de abandono de carrito, búsqueda inteligente).
Una IA puede citarlas como reales.

**Contradicción entre páginas:** la guía dice *"Sin plantillas: ya tienes la mejor plantilla"*;
la portada y el llms.txt dicen *"Elige una plantilla"*. Dos afirmaciones incompatibles en
el mismo dominio bajan la confianza de todo el sitio.

**El bueno:** `como-vender-por-whatsapp-mexico` está bien escrito y bien posicionado.
Es el modelo a replicar.

**Temas con demanda real y sin cobertura:** comparativas directas (TOOGO vs Tiendanube vs
Shopify), comisiones reales de cobro en México, obligaciones fiscales (RFC, RESICO, CFDI 4.0),
envíos y paqueterías, pago contra entrega y OXXO, catálogo de WhatsApp Business vs tienda.

---

## D. ORDEN RECOMENDADO

**Semana 1 — código (desbloquea todo lo demás)**
1. `/precios`: crear la página real y prerenderizarla, o quitarla del nav y del schema
2. `/soporte`: prerenderizar o sacar de la lista blanca
3. Redirección 308 de `/ruta/` a `/ruta`
4. `lastmod` real en el sitemap en vez del valor fijo
5. Enlazar las 4 huérfanas desde el pie del HTML para robots
6. Corregir `og:image` y quitar el `twitter:site` roto
7. `@id` en SoftwareApplication, YouTube en `sameAs`, BreadcrumbList

**Semana 2 — índice**
8. Borrar el sitemap del apex en GSC
9. Bing Webmaster Tools + IndexNow
10. Pedir reindexación de la portada y las 6 URLs del blog

**Semanas 3-8 — presencia externa (aquí está el techo)**
11. G2 y Product Hunt con nombre calificado
12. Outreach a los 6 listicles identificados
13. Wikidata
14. LinkedIn y YouTube reales
15. Desambiguación en llms.txt

**Continuo — contenido**
16. Consolidar los 4 artículos flojos en comparativas honestas con cifras
17. Autor persona real con bio
18. Publicar un dato propio medido y repetirlo cada trimestre

---

## E. NO VERIFICABLE — no darlo por cierto

- **Qué cita hoy cada IA exactamente.** No hay acceso a sus paneles de citas.
- **Core Web Vitals reales.** La API de PageSpeed devolvió 429 (cuota agotada).
- **Trustpilot** (403 antibot), **Instagram** (muro de login), **titularidad del LinkedIn**.
- **Volumen de búsqueda.** Los conectores de Ahrefs y Similarweb están sin autorizar.
- **Cuáles son las ~21 URLs que GSC detectó.** Solo 12 están en el sitemap; las otras hay
  que sacarlas del informe de Cobertura.

## F. CORREGIDO DURANTE LA AUDITORÍA

Errores de los analistas que se descartaron al verificar:

- "`/ayuda` y `/terminos` dan 404 a Google" — falso, se probaron rutas inexistentes.
  Las reales (`/ayuda/configurar-pagos`, `/terminos-condiciones`) devuelven 200.
- "Cualquier ruta inventada devuelve 200" — falso para Googlebot, que recibe 404 correcto.
  Solo pasa con UA de navegador.
- "Mercado Shops cierra el 31-dic-2026" — falso. Cerró el **31-dic-2025**, hace nueve meses.
- "No hay canal de YouTube" — falso. `youtube.com/@toogostore` existe.
