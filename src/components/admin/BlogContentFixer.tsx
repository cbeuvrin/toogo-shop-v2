import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { processHeadingsWithIds } from "@/lib/blogUtils";
import { toast } from "sonner";
import { Wrench } from "lucide-react";

export function BlogContentFixer() {
  const fixGuideArticle = async () => {
    try {
      // 1. Obtener el artículo de la guía
      const { data: post, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, content, slug')
        .eq('slug', 'guia-completa-para-crear-tu-tienda-en-linea-con-toogo')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!post) {
        toast.error('Artículo de la guía no encontrado');
        return;
      }

      // 2. Procesar el contenido para agregar IDs
      const processedContent = processHeadingsWithIds(post.content);

      // 3. Actualizar el artículo
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ content: processedContent })
        .eq('id', post.id);

      if (updateError) throw updateError;

      toast.success('✅ Artículo actualizado: IDs agregados a todos los headings');
    } catch (error) {
      console.error('Error actualizando artículo:', error);
      toast.error('Error al actualizar el artículo');
    }
  };

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Reparar IDs en headings
        </CardTitle>
        <CardDescription>
          Agrega IDs a todos los headings del artículo de la guía para que funcionen los enlaces de la tabla de contenidos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={fixGuideArticle} variant="outline">
          Reparar artículo de la guía
        </Button>
      </CardContent>
    </Card>
  );
}
