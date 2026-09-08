import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FB_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '1595938024873627';

// Function to escape HTML special characters
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Function to detect image type from URL
const getImageType = (url: string): string => {
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
    const previewMode = url.searchParams.get('preview') === 'crawler';
    const method = req.method;
    
    console.log('Request received:', {
      method: method,
      pathname: url.pathname,
      userAgent: userAgent,
      searchParams: url.searchParams.toString(),
      previewMode
    });
    
    // Detectar crawler o modo preview. BUG previo: solo incluía redes sociales, así
    // que Googlebot y los bots de IA (que el rewrite de Vercel SÍ manda aquí) no se
    // reconocían → 302 a la app y los posts nunca prerenderizaban. Ahora incluye
    // buscadores y agentes de IA.
    const isCrawler = previewMode || /(bot|crawler|spider|Googlebot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|PerplexityBot|Perplexity-User|Applebot|Amazonbot|Bytespider|bingbot|DuckAssistBot|MistralAI-User|Google-Extended|Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview)/i.test(userAgent);
    
    // Obtener el path del query param o del pathname
    const blogPath = url.searchParams.get('path') || url.pathname;
    
    console.log('Crawler detected:', isCrawler);
    console.log('Blog path:', blogPath);
    
    // Listado /blog para crawlers: antes caía al shell de la SPA con el
    // canonical de la home y el listado era invisible para buscadores e IA.
    if (isCrawler && (blogPath === '/blog' || blogPath === '/blog/')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, title, seo_title, seo_description, excerpt, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      const list = posts || [];
      const canonical = 'https://www.toogo.store/blog';
      const title = 'Blog de TOOGO — Guías para vender en línea en México';
      const description = 'Guías y consejos para emprendedores: cómo crear tu tienda en línea gratis, vender por WhatsApp y cobrar en línea en México.';
      const ld = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': `${canonical}#blog`,
        url: canonical,
        name: title,
        inLanguage: 'es-MX',
        publisher: { '@id': 'https://www.toogo.store/#organization' },
        blogPost: list.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.seo_title || p.title,
          url: `https://www.toogo.store/blog/${p.slug}`,
          datePublished: p.published_at,
        })),
      });
      const items = list.map((p) => `    <article>
      <h2><a href="https://www.toogo.store/blog/${escapeHtml(p.slug)}">${escapeHtml(p.seo_title || p.title)}</a></h2>
      <p>${escapeHtml(p.seo_description || p.excerpt || '')}</p>
      ${p.published_at ? `<time datetime="${escapeHtml(String(p.published_at).slice(0, 10))}">${escapeHtml(String(p.published_at).slice(0, 10))}</time>` : ''}
    </article>`).join('\n');
      const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="TOOGO">
  <meta property="og:locale" content="es_MX">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <script type="application/ld+json">${ld}</script>
</head>
<body>
  <header><a href="https://www.toogo.store/">TOOGO</a></header>
  <main>
    <h1>Blog de TOOGO</h1>
    <p>${escapeHtml(description)}</p>
${items}
  </main>
  <footer><p>TOOGO — Crea tu tienda en línea gratis y manéjala desde WhatsApp.</p></footer>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...corsHeaders },
      });
    }

    // Solo procesar si es un crawler y es una URL de blog
    if (!isCrawler || !blogPath.startsWith('/blog/')) {
      console.log('Not a crawler or not a blog URL, redirecting to app');
      
      // Para HEAD requests, devolver 302 sin cuerpo
      if (method === 'HEAD') {
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': blogPath || '/',
            ...corsHeaders
          }
        });
      }
      
      return new Response(null, {
        status: 302,
        headers: { 
          'Location': blogPath || '/',
          ...corsHeaders
        }
      });
    }
    
    // Extraer slug del blog
    const slug = blogPath.replace('/blog/', '').replace(/\/$/, ''); // Remove trailing slash if present
    console.log('Processing blog path:', blogPath);
    console.log('Extracted slug:', slug);
    
    if (!slug) {
      return new Response('Invalid blog URL', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Obtener datos del post
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    
    if (error || !post) {
      console.error('Post not found:', error);
      return new Response('Blog post not found', { 
        status: 404,
        headers: corsHeaders
      });
    }
    
    console.log('Post found:', post.title);
    console.log('Serving crawler SEO HTML (no redirect)');
    
    const articleUrl = `https://www.toogo.store/blog/${post.slug}`;
    const imageUrl = post.featured_image_url || 'https://www.toogo.store/assets/toogo-og-image.jpg';
    const imageType = getImageType(imageUrl);
    const title = escapeHtml(post.seo_title || post.title);
    const description = escapeHtml(post.seo_description || post.excerpt || '');
    
    // Safe handling of seo_keywords
    const tags = Array.isArray(post.seo_keywords) ? post.seo_keywords.slice(0, 5) : [];

    // Contenido real del artículo (mejora enorme de citabilidad: el crawler ve el
    // texto completo, no solo el resumen). Viene de un editor rich-text (HTML).
    const articleContent = post.content || post.body || post.content_html || '';

    // JSON-LD BlogPosting. dateModified es la señal con más peso para citación por IA.
    const blogLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || '',
      image: imageUrl,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      inLanguage: 'es-MX',
      author: { '@type': 'Organization', name: 'TOOGO', url: 'https://www.toogo.store/' },
      publisher: { '@type': 'Organization', name: 'TOOGO', logo: { '@type': 'ImageObject', url: 'https://www.toogo.store/assets/mascot-toogo.png' } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    });

    // Generar HTML con meta tags correctos
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title} - TOOGO Blog</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  ${post.seo_keywords && post.seo_keywords.length > 0 ? `<meta name="keywords" content="${post.seo_keywords.join(', ')}">` : ''}
  
  <!-- Open Graph / Facebook / LinkedIn -->
  <meta property="fb:app_id" content="${FB_APP_ID}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:site_name" content="TOOGO">
  <meta property="og:locale" content="es_MX">
  
  <!-- Article specific -->
  <meta property="article:published_time" content="${post.published_at || post.created_at}">
  <meta property="article:modified_time" content="${post.updated_at}">
  <meta property="article:author" content="TOOGO">
  ${tags.map((keyword: string) => `<meta property="article:tag" content="${escapeHtml(keyword)}">`).join('\n  ')}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@toogo_store">
  <meta name="twitter:url" content="${articleUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${articleUrl}">
  
  <!-- Language -->
  <meta http-equiv="Content-Language" content="es-MX">

  <!-- Structured data -->
  <script type="application/ld+json">${blogLd}</script>
</head>
<body>
  <article>
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${imageUrl}" alt="${title}" />
    <div>${articleContent}</div>
  </article>
</body>
</html>`;
    
    console.log(`Returning HTML for crawler (method: ${method})`);
    
    // For HEAD requests, return headers only
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=600',
          ...corsHeaders
        }
      });
    }
    
    return new Response(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=600',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error in blog-seo-handler:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
