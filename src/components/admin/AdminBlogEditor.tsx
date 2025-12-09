import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useBlogPosts, useDeleteBlogPost } from '@/hooks/useBlogPosts';
import { BlogPostForm } from './BlogPostForm';
import { BlogAutoGeneration } from './BlogAutoGeneration';
import { Plus, Search, Edit, Trash2, Eye, Bot } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const AdminBlogEditor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [editingPost, setEditingPost] = useState<any>(null);

  const { data: allPosts, isLoading } = useBlogPosts();
  const deleteMutation = useDeleteBlogPost();

  const filteredPosts = allPosts?.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.slug.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const draftPosts = filteredPosts.filter(p => p.status === 'draft');
  const publishedPosts = filteredPosts.filter(p => p.status === 'published');

  const handleNewPost = () => {
    setEditingPost(null);
    setActiveTab('editor');
  };

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setActiveTab('editor');
  };

  const handleDeletePost = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSaveComplete = () => {
    setActiveTab('list');
    setEditingPost(null);
  };

  if (activeTab === 'editor') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingPost ? 'Editar artículo' : 'Nuevo artículo'}
          </h2>
          <Button variant="outline" onClick={() => setActiveTab('list')}>
            ← Volver a la lista
          </Button>
        </div>
        <BlogPostForm post={editingPost} onSave={handleSaveComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Blog</h2>
          <p className="text-muted-foreground">Gestiona los artículos de tu blog</p>
        </div>
        <Button onClick={handleNewPost}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo artículo
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar artículos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({filteredPosts.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Publicados ({publishedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Borradores ({draftPosts.length})
          </TabsTrigger>
          <TabsTrigger value="auto">
            <Bot className="w-4 h-4 mr-2" />
            Auto-Generación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <PostsList
            posts={filteredPosts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <PostsList
            posts={publishedPosts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <PostsList
            posts={draftPosts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="auto" className="space-y-4">
          <BlogAutoGeneration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface PostsListProps {
  posts: any[];
  onEdit: (post: any) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const PostsList = ({ posts, onEdit, onDelete, isLoading }: PostsListProps) => {
  if (isLoading) {
    return <div className="text-center py-8">Cargando artículos...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">No hay artículos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {post.featured_image_url && (
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-32 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">/{post.slug}</p>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                    {post.status === 'published' ? 'Publicado' : 'Borrador'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {post.view_count || 0} vistas
                  </div>
                  {post.seo_score !== undefined && (
                    <Badge variant={post.seo_score >= 80 ? 'default' : post.seo_score >= 60 ? 'secondary' : 'destructive'}>
                      SEO: {post.seo_score}
                    </Badge>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => onEdit(post)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El artículo será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(post.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
