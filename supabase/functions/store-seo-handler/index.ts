import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FB_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '1595938024873627';

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

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!
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
