import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Eye } from 'lucide-react';
import { useBlogPosts } from '@/hooks/useBlogPosts';

interface RelatedArticlesProps {
  currentPostId: string;
}

export function RelatedArticles({ currentPostId }: RelatedArticlesProps) {
  const { data: posts, isLoading } = useBlogPosts('published');
  
  const relatedPosts = posts
    ?.filter(p => p.id !== currentPostId)
    .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - 
                     new Date(a.published_at || a.created_at).getTime())
    .slice(0, 3) || [];

  if (isLoading || relatedPosts.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-8">Artículos recientes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {relatedPosts.map((post) => (
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
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h3>
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
    </div>
  );
}
