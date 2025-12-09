import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlatformFacebookPixel } from '@/hooks/usePlatformFacebookPixel';

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: posts, isLoading } = useBlogPosts('published');
  const { trackPageView } = usePlatformFacebookPixel();

  useEffect(() => {
    trackPageView('/blog', 'TOOGO - Blog');
  }, []);

  const filteredPosts = posts?.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <>
      <Helmet>
        <title>Blog | TOOGO</title>
        <meta name="description" content="Descubre artículos, guías y consejos sobre e-commerce y ventas online" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog de TOOGO</h1>
            <p className="text-xl opacity-90">
              Consejos, guías y tendencias para hacer crecer tu negocio online
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="container mx-auto px-4 -mt-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Buscar artículos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-card shadow-lg h-14 text-lg"
            />
          </div>
        </div>

        {/* Posts Grid */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando artículos...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron artículos' : 'Aún no hay artículos publicados'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden group">
                    {post.featured_image_url && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.view_count || 0}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
