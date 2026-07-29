import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FB_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '1595938024873627';

// ─── Prerender del SITIO DE MARKETING (www.toogo.store) ───
// Cuando el host es el de marketing (no una tienda de tenant), servimos HTML de
// marketing con el mensaje correcto (tienda gratis + administrar por WhatsApp).
// Va aquí (mismo handler) porque Vercel no permite dos rewrites con source "/".
const MKT_SITE = 'https://www.toogo.store';
const MKT_OG = `${MKT_SITE}/assets/mascot-toogo.png`;
const MKT_PAGES: Record<string, { title: string; description: string; h1: string; body: string[] }> = {
    '/': {
        title: 'Crea tu tienda en línea gratis y manéjala por WhatsApp | TOOGO',
        description: 'Crea tu tienda en línea gratis en 5 minutos y adminístrala desde WhatsApp: sube productos con una foto, recibe pedidos y consulta tus ventas por chat. Hecho para México.',
        h1: 'Crea tu tienda en línea gratis. Manéjala desde WhatsApp.',
        body: [
            'TOOGO es la plataforma mexicana para crear tu tienda en línea gratis en 5 minutos, sin programar. Elige una plantilla, sube tus productos y empieza a vender.',
            'Lo que hace diferente a TOOGO: administras toda tu tienda desde WhatsApp. Subes un producto mandando una foto y un precio, recibes y gestionas tus pedidos, cambias el diseño de tu tienda y consultas tus ventas del día — todo por chat, sin abrir la computadora.',
            'Tus clientes también pueden pedirte por WhatsApp, y cobras en línea con Mercado Pago, PayPal, OXXO y SPEI. Conecta tu dominio propio y vende en toda la República.',
        ],
    },
    '/crear-tienda-con-ia': {
        title: 'Crear tu tienda online con inteligencia artificial gratis | TOOGO',
        description: 'Crea tu tienda en línea gratis con ayuda de inteligencia artificial y adminístrala desde WhatsApp: sube productos con una foto, y la IA arma tu catálogo. Hecho para México.',
        h1: 'Crea tu tienda en línea gratis y manéjala desde WhatsApp',
        body: [
            'Con TOOGO creas tu tienda en línea gratis en minutos y la manejas conversando con una inteligencia artificial por WhatsApp. Le mandas una foto y el precio de tu producto, y la IA lo publica en tu tienda por ti.',
            'La IA de TOOGO también te ayuda a describir tus productos, organizar tu catálogo, revisar tus ventas del día y cambiar el diseño de tu tienda — todo por chat, sin programar y sin abrir la computadora.',
            'Es la forma más rápida de tener una tienda en línea profesional en México: elige una plantilla, deja que la IA arme tu catálogo desde WhatsApp, conecta tu dominio y empieza a vender con cobros por Mercado Pago, PayPal, OXXO y SPEI.',
        ],
    },
};

const marketingHtml = (rawPath: string): string => {
    let path = rawPath || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const page = MKT_PAGES[path] || MKT_PAGES['/'];
    const canonical = `${MKT_SITE}${path === '/' ? '/' : path}`;
    const title = escapeHtml(page.title);
    const description = escapeHtml(page.description);
    const ld = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'Organization', '@id': `${MKT_SITE}/#organization`, name: 'TOOGO', alternateName: ['TOOGO Store', 'TOOGO México'], url: `${MKT_SITE}/`, logo: { '@type': 'ImageObject', url: MKT_OG }, description: 'Plataforma mexicana para crear una tienda en línea gratis en 5 minutos y administrarla desde WhatsApp, sin programar.', areaServed: { '@type': 'Country', name: 'México' }, sameAs: ['https://www.facebook.com/Toogo.Online/'] },
            { '@type': 'WebSite', '@id': `${MKT_SITE}/#website`, url: `${MKT_SITE}/`, name: 'TOOGO', inLanguage: 'es-MX', publisher: { '@id': `${MKT_SITE}/#organization` } },
            { '@type': 'SoftwareApplication', name: 'TOOGO', applicationCategory: 'BusinessApplication', applicationSubCategory: 'E-commerce Platform', operatingSystem: 'Web, iOS, Android', url: `${MKT_SITE}/`, inLanguage: 'es-MX', description: 'Crea tu tienda en línea gratis en 5 minutos y adminístrala desde WhatsApp. Sin programar.', featureList: ['Administra tu tienda desde WhatsApp', 'Sube productos mandando una foto por WhatsApp', 'Recibe y gestiona pedidos por chat', 'Consulta tus ventas preguntando por WhatsApp', 'Cambia el diseño de tu tienda sin computadora', 'Cobros con Mercado Pago, PayPal, OXXO y SPEI', 'Dominio propio y plantillas listas'], offers: { '@type': 'Offer', price: '0', priceCurrency: 'MXN', availability: 'https://schema.org/InStock', url: `${MKT_SITE}/precios` }, publisher: { '@id': `${MKT_SITE}/#organization` } },
        ],
    });
    return `<!DOCTYPE html>
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
  <meta property="og:image" content="${MKT_OG}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${MKT_OG}">
  <script type="application/ld+json">${ld}</script>
</head>
<body>
  <header><a href="${MKT_SITE}/">TOOGO</a>
    <nav><a href="${MKT_SITE}/">Inicio</a> <a href="${MKT_SITE}/precios">Precios</a> <a href="${MKT_SITE}/blog">Blog</a></nav>
  </header>
  <main>
    <h1>${escapeHtml(page.h1)}</h1>
    ${page.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n    ')}
  </main>
  <footer><p>TOOGO — Crea tu tienda en línea gratis y manéjala desde WhatsApp. Hecho para México.</p></footer>
</body>
</html>`;
};

// Function to escape HTML special characters
const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Function to detect image type from URL
const getImageType = (url: string): string => {
    if (!url) return 'image/jpeg';
    const extension = url.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
    };
    return typeMap[extension] || 'image/jpeg';
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const userAgent = req.headers.get('user-agent') || '';
        const method = req.method;

        // Check if it's a crawler
        const isCrawler = /(Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview|Googlebot)/i.test(userAgent);

        // Extract hostname from the request
        // The request to the function will be like https://project.supabase.co/functions/v1/store-seo-handler?host=tienda.com
        // OR we might need to rely on the 'host' query param passed by Vercel rewrite?
        // Let's assume Vercel rewrites preserve the original host header, or we pass it as a query param.
        // In the vercel.json rewrite, we can't easily capture the host unless we use a middleware or pass it explicitly.
        // However, usually Edge Functions behind Vercel might see the Vercel host.
        // BETTER APPROACH: Pass the host as a query parameter in vercel.json rewrite?
        // Vercel rewrites: "destination": "https://.../store-seo-handler?host=" + ... wait, we can't dynamic inject host in static vercel.json

        // WAIT. If I rewrite `/` to the function, the function receives the request.
        // The `req.url` might be the function URL, but `x-forwarded-host` or `host` header might have the original.
        // Let's check headers.

        let hostname = url.searchParams.get('host');
        if (!hostname) {
            // Fallback to headers if passed by proxy
            hostname = req.headers.get('x-forwarded-host') || req.headers.get('host');
        }

        // Clean hostname
        hostname = hostname?.split(':')[0]; // Remove port
        if (hostname?.startsWith('www.') && !hostname.includes('toogo.store')) {
            hostname = hostname.replace('www.', '');
        }

        console.log('Request received for SEO handler:', {
            method,
            url: req.url,
            hostname,
            userAgent
        });

        if (!hostname) {
            return new Response('Missing hostname', { status: 400, headers: corsHeaders });
        }

        // Rama de MARKETING: si el host es el sitio principal (no una tienda de
        // tenant), servimos el HTML de marketing. Evita el 404 "Tenant not found".
        if (hostname === 'toogo.store' || hostname === 'www.toogo.store') {
            const path = url.searchParams.get('path') || url.pathname || '/';
            return new Response(marketingHtml(path), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...corsHeaders },
            });
        }

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Get Tenant by Host (using the same RPC as frontend)
        const { data: tenantData, error: tenantError } = await supabase
            .rpc('get_tenant_by_host', { p_host: hostname });

        if (tenantError || !tenantData || tenantData.length === 0) {
            console.error('Tenant not found for host:', hostname, tenantError);
            return new Response('Tenant not found', { status: 404, headers: corsHeaders });
        }

        const tenant = tenantData[0];

        // 2. Get Tenant Settings
        const { data: settingsData, error: settingsError } = await supabase
            .from('tenant_settings')
            .select('*')
            .eq('tenant_id', tenant.id)
            .single();

        // Default values
        const settings = settingsData || {};

        // Construct Meta Data
        const title = escapeHtml(settings.share_title || tenant.name || 'Tienda Online');
        const description = escapeHtml(settings.share_description || `${tenant.name} - Tienda online creada con TOOGO`);
        const imageUrl = settings.share_image_url || settings.logo_url || 'https://www.toogo.store/assets/toogo-og-image.jpg';
        const imageType = getImageType(imageUrl);
        const storeUrl = `https://${hostname}`;

        // Generate HTML
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="fb:app_id" content="${FB_APP_ID}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${storeUrl}">
  <meta property="og:site_name" content="${escapeHtml(tenant.name)}">
  <meta property="og:locale" content="es_MX">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${storeUrl}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}" />
</body>
</html>`;

        console.log(`Serving SEO HTML for ${hostname}`);

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=60', // Short cache for dynamic updates
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error('Error in store-seo-handler:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
});
