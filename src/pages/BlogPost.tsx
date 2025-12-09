import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { useBlogPost } from '@/hooks/useBlogPosts';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Eye, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';
import { usePlatformFacebookPixel } from '@/hooks/usePlatformFacebookPixel';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { processHeadingsWithIds, extractHeadings } from '@/lib/blogUtils';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useBlogPost(slug!);
  const { trackPageView, trackViewContent } = usePlatformFacebookPixel();

  useEffect(() => {
    if (post) {
      trackPageView(`/blog/${slug}`, post.title);
      trackViewContent(post.title, 'article', {
        content_category: post.seo_keywords?.[0] || 'blog'
      });
    }
  }, [post, slug]);

  // Process content and extract headings in a single pass
  const { processedContent, headings } = useMemo(() => {
    if (!post?.content) {
      return { processedContent: '', headings: [] };
    }
    
    const processed = processHeadingsWithIds(post.content);
    const extractedHeadings = extractHeadings(processed);
    
    return { 
      processedContent: processed, 
      headings: extractedHeadings 
    };
  }, [post?.content]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando artículo...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">Artículo no encontrado</p>
        <Link to="/blog">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al blog
          </Button>
        </Link>
      </div>
    );
  }

  const shareUrl = window.location.href;
  const shareText = post.seo_description || post.excerpt || post.title;


  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.seo_description || post.excerpt,
    "image": post.featured_image_url,
    "datePublished": post.published_at || post.created_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Organization",
      "name": "TOOGO"
    }
  };

  return (
    <>
      <Helmet>
        <title>{post.seo_title || post.title}</title>
        <meta name="description" content={post.seo_description || post.excerpt || ''} />
        {post.seo_keywords && post.seo_keywords.length > 0 && (
          <meta name="keywords" content={post.seo_keywords.join(', ')} />
        )}
        
        {/* Open Graph */}
        <meta property="fb:app_id" content="1595938024873627" />
        <meta property="og:title" content={post.seo_title || post.title} />
        <meta property="og:description" content={post.seo_description || post.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:site_name" content="TOOGO Blog" />
        {post.featured_image_url && (
          <>
            <meta property="og:image" content={post.featured_image_url} />
            <meta property="og:image:secure_url" content={post.featured_image_url} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={post.title} />
          </>
        )}
        
        {/* Article specific tags */}
        <meta property="article:published_time" content={post.published_at || post.created_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:author" content="TOOGO" />
        {post.seo_keywords && post.seo_keywords.slice(0, 5).map((keyword) => (
          <meta key={keyword} property="article:tag" content={keyword} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seo_title || post.title} />
        <meta name="twitter:description" content={post.seo_description || post.excerpt || ''} />
        {post.featured_image_url && <meta name="twitter:image" content={post.featured_image_url} />}
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8">
          <div className="container mx-auto px-4">
            <Link to="/blog">
              <Button variant="ghost" className="mb-4 text-primary-foreground hover:text-primary-foreground/80">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al blog
              </Button>
            </Link>
          </div>
        </div>

        {/* Article */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Featured Image */}
            {post.featured_image_url && (
              <div className="mb-8 -mt-0 md:-mt-16 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-[200px] sm:h-[250px] md:h-[350px] lg:h-[400px] object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div className="max-w-4xl mx-auto px-4 lg:px-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>

              {/* Meta */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.published_at || post.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {post.view_count || 0} vistas
                </div>
              </div>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-xl text-muted-foreground mb-8 italic border-l-4 border-primary pl-4">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Two Column Layout: Content + TOC */}
            <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 max-w-4xl mx-auto px-4 lg:px-0">
              {/* Main Content */}
              <article className="max-w-none">
                {/* Table of Contents - Mobile/Tablet ONLY (arriba del contenido) */}
                <div className="lg:hidden mb-8">
                  {headings.length > 0 && <TableOfContents headings={headings} />}
                </div>

                {/* Content */}
                {processedContent ? (
                  <div 
                    className="prose prose-lg max-w-none mb-12"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      Este artículo está siendo procesado...
                    </p>
                  </div>
                )}
              </article>

              {/* Table of Contents - Desktop ONLY (sidebar) */}
              <aside className="hidden lg:block">
                {headings.length > 0 && <TableOfContents headings={headings} />}
              </aside>
            </div>
          </div>
        </div>

        {/* Bottom Section - Full Width */}
        <div className="container mx-auto max-w-4xl px-4 lg:px-0">
          {/* Share Buttons */}
          <div className="border-t pt-8">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Compartir este artículo
            </h3>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={shareOnTwitter}>
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnFacebook}>
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnLinkedIn}>
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
            </div>
          </div>

          {/* Keywords */}
          {post.seo_keywords && post.seo_keywords.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold mb-3">Temas relacionados</h3>
              <div className="flex flex-wrap gap-2">
                {post.seo_keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA Banner */}
          <div className="mt-12">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden relative">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Texto y botón */}
                <div className="flex-1 text-center md:text-left z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    ¿Listo para crear tu tienda online?
                  </h2>
                  <p className="text-white/90 text-base md:text-lg mb-5 max-w-xl">
                    Con TOOGO puedes lanzar tu e-commerce en minutos. Sin complicaciones técnicas, sin costos iniciales.
                  </p>
                  <Link to="/">
                    <Button 
                      size="lg" 
                      className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-6 py-5 text-base md:text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                    >
                      TOOGO
                    </Button>
                  </Link>
                </div>
                
                {/* Imagen del muñeco */}
                <div className="flex-shrink-0 relative">
                  <img 
                    src="/assets/blog-cta-mascot.png" 
                    alt="TOOGO Shopping Mascot" 
                    className="w-32 md:w-48 lg:w-56 h-auto drop-shadow-2xl animate-float"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Artículos relacionados */}
          <RelatedArticles currentPostId={post.id} />
        </div>
      </div>
    </>
  );
}
