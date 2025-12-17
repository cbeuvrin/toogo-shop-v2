
// Vercel Edge Middleware
// Intercepts requests to '/' and proxies crawlers to the SEO Edge Function.

export const config = {
    matcher: '/',
};

export default async function middleware(request: Request) {
    const userAgent = request.headers.get('user-agent') || '';
    // Regex matching Facebook, WhatsApp, Twitter, etc.
    const isCrawler = /.*(bot|crawler|spider|crawling|Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview|Googlebot).*/i.test(userAgent);

    if (isCrawler) {
        const url = new URL(request.url);
        const host = request.headers.get('host') || url.hostname;

        // Construct destination URL
        // We pass the original host as a query param so the function knows which tenant to load
        const destination = `https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/store-seo-handler?host=${encodeURIComponent(host)}`;

        console.log(`[Middleware] Proxying crawler (${userAgent}) to ${destination}`);

        // Proxy the request
        try {
            const response = await fetch(destination);

            // Return the response from the Edge Function
            // We preserve the status and headers (like Content-Type: text/html)
            return new Response(response.body, {
                status: response.status,
                headers: response.headers
            });
        } catch (error) {
            console.error('[Middleware] Error proxying to SEO handler:', error);
            // Fallback to continuing (serving static app) if function fails
        }
    }
}
