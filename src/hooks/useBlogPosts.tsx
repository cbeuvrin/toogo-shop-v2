import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  seo_score?: number;
  seo_analysis?: any;
  status: 'draft' | 'published';
  published_at?: string;
  view_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useBlogPosts = (status?: 'draft' | 'published') => {
  return useQuery({
    queryKey: ['blog-posts', status],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from('blog_posts')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return data as BlogPost;
    },
    enabled: !!slug,
  });
};

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert(post as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Artículo creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear artículo: ' + error.message);
    },
  });
};

export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Artículo actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar artículo: ' + error.message);
    },
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Artículo eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar artículo: ' + error.message);
    },
  });
};

export const useAnalyzeSEO = () => {
  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      seoTitle?: string;
      seoDescription?: string;
      keywords?: string[];
    }) => {
      const { data: result, error } = await supabase.functions.invoke('analyze-seo-content', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
  });
};
