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

const CRAWLER_REGEX = /.*(bot|crawler|spider|crawling|Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview|Googlebot).*/i;

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

    // 2. Crawler proxy (only on '/')
    if (url.pathname === '/' && CRAWLER_REGEX.test(userAgent)) {
        const destination = `${SUPABASE_URL}/functions/v1/store-seo-handler?host=${encodeURIComponent(host)}`;
        console.log(`[Middleware] Proxying crawler (${userAgent}) to ${destination}`);

        try {
            const response = await fetch(destination);
            return new Response(response.body, {
                status: response.status,
                headers: response.headers,
            });
        } catch (error) {
            console.error('[Middleware] Error proxying to SEO handler:', error);
            // Fall through to serving the SPA
        }
    }
}
