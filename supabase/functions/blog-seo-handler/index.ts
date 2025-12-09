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
    
    // Detectar si es un crawler de redes sociales o modo preview
    const isCrawler = previewMode || /(Facebot|FacebookBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterestbot|SkypeUriPreview)/i.test(userAgent);
    
    // Obtener el path del query param o del pathname
    const blogPath = url.searchParams.get('path') || url.pathname;
    
    console.log('Crawler detected:', isCrawler);
    console.log('Blog path:', blogPath);
    
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
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}" />
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
