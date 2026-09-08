// Proxy de prerender SEO. El gateway de Supabase (*.supabase.co) degrada las
// respuestas text/html de las edge functions a text/plain + CSP sandbox
// (anti-phishing), así que Google recibía las páginas como texto plano.
// Este proxy corre en el MISMO dominio (www.toogo.store y dominios de
// tenants) y repone el Content-Type correcto. Los rewrites de vercel.json
// mandan aquí a los bots; el body lo siguen generando las edge functions.

const FUNCTIONS = {
  'store-seo-handler': 'text/html; charset=utf-8',
  'blog-seo-handler': 'text/html; charset=utf-8',
  'generate-sitemap': 'application/xml; charset=utf-8',
};

const BASE = 'https://herqxhfmsstbteahhxpr.supabase.co/functions/v1';

export default async function handler(req, res) {
  const fn = String(req.query.fn || '');
  const path = String(req.query.path || '/');
  const contentType = FUNCTIONS[fn];
  if (!contentType) {
    res.status(404).setHeader('X-Robots-Tag', 'noindex').send('Not found');
    return;
  }
  const upstream = await fetch(`${BASE}/${fn}?path=${encodeURIComponent(path)}`, {
    headers: {
      'user-agent': req.headers['user-agent'] || '',
      // El host real (marketing o dominio de tenant): la edge function decide
      // con esto si sirve la rama de marketing o la tienda del tenant.
      'x-forwarded-host': req.headers['x-forwarded-host'] || req.headers.host || 'www.toogo.store',
    },
    redirect: 'manual',
  });
  const body = await upstream.text();
  res.status(upstream.status);
  const location = upstream.headers.get('location');
  if (location) res.setHeader('Location', location);
  if (upstream.ok) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex');
  }
  res.send(body);
}
