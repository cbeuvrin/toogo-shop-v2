// Prerender SEO para el SITIO DE MARKETING (www.toogo.store), separado del
// store-seo-handler (que es solo para las tiendas de los tenants).
// Vercel reescribe aquí las peticiones de crawlers/agentes de IA sobre las rutas
// de marketing, para que reciban HTML real (title, H1, contenido, JSON-LD) en vez
// de la SPA vacía o un 404.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE = 'https://www.toogo.store';
const OG_IMAGE = `${SITE}/assets/mascot-toogo.png`;

const escapeHtml = (t: string): string =>
  (t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

interface Page {
  title: string;        // <= ~60 car
  description: string;  // <= ~155 car
  h1: string;
  body: string[];       // párrafos de contenido real
}

// Contenido por ruta. Mensaje corregido: TOOGO = crear tienda gratis + el
// diferenciador único = administrarla por WhatsApp.
const PAGES: Record<string, Page> = {
  '/': {
    title: 'Crea tu tienda en línea gratis y manéjala por WhatsApp | TOOGO',
    description:
      'Crea tu tienda en línea gratis en 5 minutos y adminístrala desde WhatsApp: sube productos con una foto, recibe pedidos y consulta tus ventas por chat. Hecho para México.',
    h1: 'Crea tu tienda en línea gratis. Manéjala desde WhatsApp.',
    body: [
      'TOOGO es la plataforma mexicana para crear tu tienda en línea gratis en 5 minutos, sin programar. Elige una plantilla, sube tus productos y empieza a vender.',
      'Lo que hace diferente a TOOGO: administras toda tu tienda desde WhatsApp. Subes un producto mandando una foto y un precio, recibes y gestionas tus pedidos, cambias el diseño de tu tienda y consultas tus ventas del día — todo por chat, sin abrir la computadora.',
      'Tus clientes también pueden pedirte por WhatsApp, y cobras en línea con Mercado Pago, PayPal, OXXO y SPEI. Conecta tu dominio propio y vende en toda la República.',
    ],
  },
  '/precios': {
    title: 'Precios de TOOGO: crea tu tienda en línea gratis | TOOGO',
    description:
      'Empieza gratis con TOOGO. Crea tu tienda en línea sin mensualidad y adminístrala por WhatsApp. Conoce los planes y comisiones para vender en México.',
    h1: 'Precios de TOOGO',
    body: [
      'TOOGO tiene un plan gratis para crear tu tienda en línea y empezar a vender sin mensualidad. Administras tu tienda desde WhatsApp desde el primer día.',
      'Consulta los planes, las comisiones y las funciones incluidas para vender en línea en México con dominio propio y cobros integrados.',
    ],
  },
};

const jsonLd = (page: Page, canonical: string) => {
  const graph: any[] = [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'TOOGO',
      alternateName: ['TOOGO Store', 'TOOGO México'],
      url: `${SITE}/`,
      logo: { '@type': 'ImageObject', url: OG_IMAGE },
      description:
        'Plataforma mexicana para crear una tienda en línea gratis en 5 minutos y administrarla desde WhatsApp, sin conocimientos de programación.',
      areaServed: { '@type': 'Country', name: 'México' },
      sameAs: ['https://www.facebook.com/Toogo.Online/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'TOOGO',
      inLanguage: 'es-MX',
      publisher: { '@id': `${SITE}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'TOOGO',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'E-commerce Platform',
      operatingSystem: 'Web, iOS, Android',
      url: `${SITE}/`,
      inLanguage: 'es-MX',
      description:
        'Crea tu tienda en línea gratis en 5 minutos y adminístrala desde WhatsApp. Sin programar.',
      featureList: [
        'Administra tu tienda desde WhatsApp',
        'Sube productos mandando una foto por WhatsApp',
        'Recibe y gestiona pedidos por chat',
        'Consulta tus ventas preguntando por WhatsApp',
        'Cambia el diseño de tu tienda sin computadora',
        'Cobros con Mercado Pago, PayPal, OXXO y SPEI',
        'Dominio propio y plantillas listas',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'MXN',
        availability: 'https://schema.org/InStock',
        url: `${SITE}/precios`,
      },
      publisher: { '@id': `${SITE}/#organization` },
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // La ruta llega por ?path= (la inyecta el rewrite de Vercel) o por el propio path.
    let path = url.searchParams.get('path') || url.pathname || '/';
    // Normalizar: quitar la parte de la función si viniera en el path, y trailing slash.
    if (path.includes('/marketing-seo-handler')) path = '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    const page = PAGES[path] || PAGES['/'];
    const canonical = `${SITE}${path === '/' ? '/' : path}`;
    const title = escapeHtml(page.title);
    const description = escapeHtml(page.description);

    const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="TOOGO">
  <meta property="og:locale" content="es_MX">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${OG_IMAGE}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${OG_IMAGE}">

  <script type="application/ld+json">${jsonLd(page, canonical)}</script>
</head>
<body>
  <header>
    <a href="${SITE}/">TOOGO</a>
    <nav>
      <a href="${SITE}/">Inicio</a>
      <a href="${SITE}/precios">Precios</a>
      <a href="${SITE}/blog">Blog</a>
    </nav>
  </header>
  <main>
    <h1>${escapeHtml(page.h1)}</h1>
    ${page.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n    ')}
  </main>
  <footer>
    <p>TOOGO — Crea tu tienda en línea gratis y manéjala desde WhatsApp. Hecho para México.</p>
  </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('marketing-seo-handler error:', error);
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});
