// Vercel Edge Middleware
// 1. Proxies crawlers to the SEO Edge Function on '/'
// 2. Issues 301 redirect from any host that's an alias (e.g. subdominio.toogo.store)
//    to the tenant's primary_host (custom domain) when they differ.

export const config = {
    // Run on every request EXCEPT static assets and Next/Vite internals.
    matcher: '/((?!_next/|assets/|favicon|robots\\.txt).*)',
};

const SUPABASE_URL = 'https://herqxhfmsstbteahhxpr.supabase.co';
// Anon key is safe to embed — it's public by Supabase design and already lives in .env (VITE_*).
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnF4aGZtc3N0YnRlYWhoeHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjY0MjQsImV4cCI6MjA3MjU0MjQyNH0.3JMO6wjI7PhuWdIwWTzoWbJQcvJIWNCQMUSBsKx6klw';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 1 minute for "not found / no redirect needed"

type TenantRouting = { primaryHost: string | null; expiresAt: number };
const tenantCache = new Map<string, TenantRouting>();

// Mantener en sincronía con los "has" de vercel.json. Los agentes de IA de
// recuperación en vivo (ChatGPT-User, Claude-User, Perplexity-User…) no
// contienen "bot", por eso van explícitos.
const CRAWLER_REGEX = /.*(bot|crawler|spider|crawling|Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview|Googlebot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|Applebot|Amazonbot|Bytespider|MistralAI-User|DuckAssistBot|Google-Extended).*/i;

// Un navegador de verdad: Mozilla/5.0 + un motor conocido. Se comprueba
// DESPUÉS de CRAWLER_REGEX, porque casi todos los bots también dicen Mozilla.
// Sirve para distinguir "persona con navegador" de "cliente que solo baja el
// HTML" (fetchers, herramientas, crawlers que aún no están en la lista).
const NAVEGADOR_REAL = /Mozilla\/5\.0.*(Chrome|CriOS|Safari|Firefox|FxiOS|Edg|OPR|Trident)/i;

// Rutas del sitio de MARKETING que existen de verdad para un buscador.
// Todo lo demás en www.toogo.store devuelve 404 real a los bots (antes: el
// shell de la SPA con 200 = soft-404, penalizado por GSC). Los humanos no
// pasan por aquí: siguen viendo la SPA con su página NotFound.
// Mantener en sincronía con las rutas públicas de AppRoutes.tsx.
const MKT_BOT_PATHS = new Set([
    '/',
    '/blog',
    // /precios estaba en el nav y en offers.url del schema pero no aquí: la regla
    // anti-soft-404 de abajo le devolvía 404 + noindex a todos los bots mientras
    // las personas veían la página. Mismo caso /soporte, que además no tenía
    // entrada en MKT_PAGES y caía a la cáscara vacía de React.
    '/precios',
    '/soporte',
    '/ayuda/configurar-pagos',
    '/terminos-condiciones',
    '/politica-privacidad',
    '/liberacion-responsabilidad',
]);

function isLocalOrPreviewHost(host: string): boolean {
    return host.startsWith('localhost')
        || host.startsWith('127.0.0.1')
        || host.endsWith('.vercel.app')
        || host.endsWith('.lovableproject.com')
        || host === 'toogo.store'
        || host === 'www.toogo.store';
}

async function getPrimaryHostForAlias(host: string): Promise<string | null> {
    const cached = tenantCache.get(host);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.primaryHost;
    }

    try {
        // Search tenants whose extra_hosts contains this host
        const url = `${SUPABASE_URL}/rest/v1/tenants?select=primary_host&extra_hosts=cs.%7B${encodeURIComponent(host)}%7D&limit=1`;
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
        });

        if (!res.ok) {
            tenantCache.set(host, { primaryHost: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
            return null;
        }

        const rows = (await res.json()) as Array<{ primary_host: string | null }>;
        const primaryHost = rows[0]?.primary_host ?? null;

        // Only return a value if it differs from the current host (i.e. needs redirect)
        const shouldRedirect = primaryHost && primaryHost !== host;
        const cacheValue: TenantRouting = {
            primaryHost: shouldRedirect ? primaryHost : null,
            expiresAt: Date.now() + (shouldRedirect ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
        };
        tenantCache.set(host, cacheValue);
        return cacheValue.primaryHost;
    } catch (err) {
        console.warn('[Middleware] tenant lookup failed:', err);
        tenantCache.set(host, { primaryHost: null, expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS });
        return null;
    }
}

export default async function middleware(request: Request) {
    const url = new URL(request.url);
    const host = (request.headers.get('host') || url.hostname).toLowerCase();
    const userAgent = request.headers.get('user-agent') || '';

    // 1. Redirect aliases → primary_host (only for production-like hosts)
    if (!isLocalOrPreviewHost(host)) {
        const target = await getPrimaryHostForAlias(host);
        if (target) {
            const dest = `https://${target}${url.pathname}${url.search}`;
            return new Response(null, {
                status: 301,
                headers: {
                    Location: dest,
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }
    }

    // 2. Crawler proxy en '/'. Tiene que vivir AQUÍ y no en un rewrite de
    // vercel.json: Vercel sirve archivos antes de aplicar rewrites y '/'
    // coincide con index.html, así que un rewrite de '/' nunca dispara.
    // OJO: los headers se fijan a mano — el gateway de Supabase degrada el
    // Content-Type de las edge functions a text/plain + CSP sandbox, y
    // copiarlos tal cual (bug histórico) le servía la portada a Google como
    // texto plano. Y siempre mandar ?path=/ (sin él, la función veía su
    // propio pathname y emitía canonical /store-seo-handler).
    // 3. 404 real para bots en rutas de marketing inexistentes (anti soft-404).
    // Solo hosts de marketing; nunca archivos (contienen '.') ni /api/ ni /blog/<slug>
    // (la validez del slug la decide blog-seo-handler con la base de datos).
    // 3.bis Restos de la etapa WordPress que SÍ llevan extensión, por eso la
    // regla de abajo (que excluye todo lo que tenga '.') los dejaba pasar al
    // SPA: devolvían 200 con HTML, o sea soft-404. Ojo: /sitemap.xml, los
    // llms.txt, robots.txt y el .txt de verificación del dominio son archivos
    // reales y no deben entrar aquí.
    if (
        (host === 'toogo.store' || host === 'www.toogo.store') &&
        (/\.php$/i.test(url.pathname)
            || /^\/wp-/i.test(url.pathname)
            || /^\/sitemap[-_]index\.xml$/i.test(url.pathname)
            || /^\/.+-sitemap\.xml$/i.test(url.pathname))
    ) {
        return new Response('Not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
        });
    }

    // 3.ter Archivos de descubrimiento para agentes de IA que NO publicamos.
    // Un auditor pidió /ai-catalog.json y recibió el HTML de la SPA con 200:
    // intentó leerlo como JSON y reportó "manifiesto malformado", cuando en
    // realidad el archivo nunca existió. Un 404 honesto dice lo que pasa.
    // Aplica a cualquier user-agent a propósito: quien pide estos archivos es
    // una máquina, y la regla anti-soft-404 de abajo solo mira a los bots
    // conocidos (además de saltarse todo lo que lleve '.').
    // NO generalizar a "cualquier ruta con punto": /sw.js, /registerSW.js,
    // /manifest.webmanifest, /icons/*.png y /llms-full.txt son archivos reales
    // servidos desde aquí, y el middleware corre ANTES del sistema de archivos.
    if (host === 'toogo.store' || host === 'www.toogo.store') {
        const p = url.pathname.toLowerCase();
        // acme-challenge queda fuera: es la validación de los certificados SSL.
        const wellKnownReal = p.startsWith('/.well-known/acme-challenge/');
        const esSondaDeAgente =
            (p.startsWith('/.well-known/') && !wellKnownReal)
            || p === '/ai-catalog.json'
            || p === '/ai-plugin.json'
            || p === '/openapi.json';
        if (esSondaDeAgente) {
            return new Response('Not found', {
                status: 404,
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
            });
        }
    }

    // 3.quater El contenido del blog solo llega a los user-agents de
    // CRAWLER_REGEX (rewrites de vercel.json). Cualquier otro cliente que no
    // ejecute JavaScript recibe la cáscara de React: 3 palabras. Esa lista es
    // blanca, así que cada cliente nuevo nace invisible hasta que alguien lo
    // agregue a mano.
    // Esta rama cubre SOLO el hueco: ni bot conocido ni navegador real. Los
    // navegadores siguen recibiendo la SPA y los bots conocidos siguen pasando
    // por los rewrites, ambos sin tocar. Es aditiva a propósito: si algo aquí
    // falla, se cae al comportamiento actual en vez de romperlo.
    if (
        (host === 'toogo.store' || host === 'www.toogo.store') &&
        url.pathname.startsWith('/blog') &&
        !CRAWLER_REGEX.test(userAgent) &&
        !NAVEGADOR_REAL.test(userAgent)
    ) {
        // preview=crawler es obligatorio aquí: blog-seo-handler tiene SU PROPIA
        // lista blanca de user-agents y responde 302 a todo lo que no reconoce,
        // así que reenviarle un UA como "python-requests" devolvía un redirect
        // en vez del artículo. Este parámetro es la puerta que la función ya
        // tenía prevista para forzar la rama de prerenderizado.
        const destination = `${SUPABASE_URL}/functions/v1/blog-seo-handler`
            + `?path=${encodeURIComponent(url.pathname)}&host=${encodeURIComponent(host)}`
            + `&preview=crawler`;
        try {
            const response = await fetch(destination, { headers: { 'user-agent': userAgent } });
            if (response.ok) {
                return new Response(await response.text(), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'public, max-age=300',
                    },
                });
            }
        } catch {
            // Sin red o función caída: seguimos al flujo normal (la SPA).
        }
    }

    if (
        (host === 'toogo.store' || host === 'www.toogo.store') &&
        CRAWLER_REGEX.test(userAgent) &&
        !url.pathname.includes('.') &&
        !url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/blog/')
    ) {
        const clean = url.pathname.length > 1 && url.pathname.endsWith('/')
            ? url.pathname.slice(0, -1)
            : url.pathname;
        if (!MKT_BOT_PATHS.has(clean)) {
            return new Response('Not found', {
                status: 404,
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
            });
        }
    }

    if (url.pathname === '/' && CRAWLER_REGEX.test(userAgent)) {
        const isMarketingHost = host === 'toogo.store' || host === 'www.toogo.store';
        const destination = `${SUPABASE_URL}/functions/v1/store-seo-handler?host=${encodeURIComponent(host)}&path=%2F`;
        try {
            const response = await fetch(destination, { headers: { 'user-agent': userAgent } });
            if (response.ok) {
                const body = await response.text();
                return new Response(body, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'public, max-age=300',
                    },
                });
            }
            // 404 del handler = el host no corresponde a ninguna tienda
            // (subdominio huérfano como demo.toogo.store). Antes caía al SPA y
            // Google indexaba la página "subdominio disponible" como duplicado
            // de la portada. Ahora 404 real + noindex, igual que las rutas de
            // marketing inexistentes. Otros errores (handler caído) sí caen al
            // SPA para no desindexar tiendas vivas por una falla temporal.
            if (response.status === 404 && !isMarketingHost) {
                return new Response('Not Found', {
                    status: 404,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
                });
            }
            console.error('[Middleware] SEO handler non-OK:', response.status);
            // Fall through to serving the SPA
        } catch (error) {
            console.error('[Middleware] Error proxying to SEO handler:', error);
            // Fall through to serving the SPA
        }
    }

    // 4. HUMANOS en '/' del sitio de marketing: servir dist/landing.html —
    // el index.html del build con el hero ya prerenderizado dentro de #root
    // (lo genera scripts/build-landing-html.mjs). SOLO estos dos hosts:
    // las tiendas de los tenants siguen recibiendo index.html intacto.
    // Es un rewrite (la URL visible sigue siendo '/'): el header
    // x-middleware-rewrite es el mecanismo estándar de Vercel Edge
    // Middleware para reescribir sin @vercel/edge como dependencia.
    if ((host === 'toogo.store' || host === 'www.toogo.store') && url.pathname === '/') {
        const dest = new URL('/landing.html', url);
        return new Response(null, {
            headers: { 'x-middleware-rewrite': dest.toString() },
        });
    }
}
