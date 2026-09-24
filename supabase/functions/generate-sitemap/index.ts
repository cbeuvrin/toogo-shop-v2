import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlogPost {
  slug: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting sitemap generation...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published blog posts
    const { data: blogPosts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }

    console.log(`Found ${blogPosts?.length || 0} published blog posts`);

    // Fecha de última edición REAL por página. Sigue sin usarse new Date(): un
    // lastmod que cambia a diario sin que cambie el contenido es frescura falsa y
    // Google deja de confiar en el sitemap. Pero el problema contrario también
    // existe y es el que teníamos: una fecha fija que nadie actualiza. Todas estas
    // decían 2026-07-28 mientras la portada cambiaba en septiembre, así que Google
    // dejó de pasar. Al editar de verdad una página, subir SU fecha aquí.
    const EDITADAS = {
      home: '2026-09-23',        // video bajo el hero (15 sep), enlaces del blog en el pie (16 sep), /precios y pie nuevo (23 sep)
      precios: '2026-09-23',     // página nueva
      soporte: '2026-09-23',     // página nueva
      ayuda: '2026-07-28',
      legales: '2026-07-28',
    };

    // /blog sí cambia solo: su fecha es la del post más reciente. Eso no es
    // frescura falsa, es el hecho de que se publicó algo.
    const blogLastmod = blogPosts?.length
      ? new Date(Math.max(...blogPosts.map((p: { updated_at: string }) => new Date(p.updated_at).getTime())))
          .toISOString().split('T')[0]
      : EDITADAS.home;

    // Static pages configuration
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: EDITADAS.home },
      { url: '/precios', priority: '0.9', changefreq: 'monthly', lastmod: EDITADAS.precios },
      { url: '/blog', priority: '0.9', changefreq: 'weekly', lastmod: blogLastmod },
      { url: '/ayuda/configurar-pagos', priority: '0.5', changefreq: 'monthly', lastmod: EDITADAS.ayuda },
      { url: '/soporte', priority: '0.5', changefreq: 'monthly', lastmod: EDITADAS.soporte },
      { url: '/terminos-condiciones', priority: '0.3', changefreq: 'monthly', lastmod: EDITADAS.legales },
      { url: '/politica-privacidad', priority: '0.3', changefreq: 'monthly', lastmod: EDITADAS.legales },
      { url: '/liberacion-responsabilidad', priority: '0.3', changefreq: 'monthly', lastmod: EDITADAS.legales },
    ];

    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>https://www.toogo.store${page.url}</loc>\n`;
      xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Add blog posts
    if (blogPosts && blogPosts.length > 0) {
      for (const post of blogPosts) {
        const lastmod = new Date(post.updated_at).toISOString().split('T')[0];
        xml += '  <url>\n';
        xml += `    <loc>https://www.toogo.store/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    console.log('Sitemap generated successfully');

    // Return XML with proper headers and caching
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
