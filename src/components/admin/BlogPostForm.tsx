import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOAnalyzer } from './SEOAnalyzer';
import { BlogImageManager } from './BlogImageManager';
import { AIGeneratorModal } from './AIGeneratorModal';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
  Eye,
  Sparkles
} from 'lucide-react';
import { BlogPost, useCreateBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts';

interface BlogPostFormProps {
  post?: BlogPost;
  onSave?: () => void;
}

export const BlogPostForm = ({ post, onSave }: BlogPostFormProps) => {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image_url || '');
  const [seoTitle, setSeoTitle] = useState(post?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(post?.seo_description || '');
  const [keywords, setKeywords] = useState<string[]>(post?.seo_keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4], // Solo permitir H2, H3, H4 (NO H1)
        },
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Escribe el contenido de tu artículo aquí...',
      }),
    ],
    content: post?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (!post && title) {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  }, [title, post]);

  const handleSave = async (newStatus?: 'draft' | 'published') => {
    const content = editor?.getHTML() || '';
    const finalStatus = newStatus || status;

    const postData: Partial<BlogPost> = {
      title,
      slug,
      content,
      excerpt,
      featured_image_url: featuredImage,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: keywords,
      status: finalStatus,
      published_at: finalStatus === 'published' && !post?.published_at ? new Date().toISOString() : post?.published_at,
    };

    if (post) {
      updatePost.mutate({ id: post.id, ...postData } as any, {
        onSuccess: () => onSave?.(),
      });
    } else {
      createPost.mutate(postData, {
        onSuccess: () => onSave?.(),
      });
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const insertImage = (url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAIContentGenerated = (generatedContent: {
    title: string;
    content: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  }) => {
    setTitle(generatedContent.title);
    setExcerpt(generatedContent.excerpt);
    setSeoTitle(generatedContent.seoTitle);
    setSeoDescription(generatedContent.seoDescription);
    setKeywords(generatedContent.keywords);
    
    if (editor) {
      editor.commands.setContent(generatedContent.content);
    }
  };

  const MenuBar = () => {
    if (!editor) return null;

    return (
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <AIGeneratorModal
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        onContentGenerated={handleAIContentGenerated}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contenido del artículo</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAIGenerator(true)}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generar con IA
              </Button>
            </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del artículo"
                className="text-2xl font-bold"
              />
            </div>

            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-del-articulo"
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Extracto</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Breve resumen del artículo"
                rows={3}
              />
            </div>

            <div>
              <Label>Editor de contenido</Label>
              <div className="border rounded-lg overflow-hidden">
                <MenuBar />
                <EditorContent editor={editor} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleSave('draft')}
            variant="outline"
            disabled={createPost.isPending || updatePost.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar borrador
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={createPost.isPending || updatePost.isPending}
          >
            {post?.status === 'published' ? 'Actualizar' : 'Publicar'}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Tabs defaultValue="seo">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="image">Imagen</TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seo-title">Título SEO</Label>
                  <Input
                    id="seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Título optimizado para buscadores'}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {seoTitle.length}/60 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="seo-desc">Descripción SEO</Label>
                  <Textarea
                    id="seo-desc"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Descripción que aparecerá en resultados de búsqueda"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {seoDescription.length}/160 caracteres
                  </p>
                </div>

                <div>
                  <Label>Palabras clave</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      placeholder="Añadir palabra clave"
                    />
                    <Button type="button" onClick={addKeyword} size="sm">
                      Añadir
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <SEOAnalyzer
              title={title}
              content={editor?.getHTML() || ''}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              keywords={keywords}
            />
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Imagen destacada
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Esta imagen aparecerá al inicio del artículo y en las previsualizaciones
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {featuredImage && (
                  <div className="mb-4">
                    <img
                      src={featuredImage}
                      alt="Imagen destacada"
                      className="w-full h-48 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFeaturedImage('')}
                      className="mt-2"
                    >
                      Quitar imagen
                    </Button>
                  </div>
                )}
                <BlogImageManager
                  onImageSelect={(url) => setFeaturedImage(url)}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-500/20">
              <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Imágenes del contenido
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estas imágenes se insertarán dentro del texto del artículo
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <BlogImageManager
                  onImageSelect={insertImage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
};
