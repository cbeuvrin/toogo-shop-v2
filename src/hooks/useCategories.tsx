// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';

export interface Category {
  id: string;
  name: string;
  slug: string;
  showOnHome?: boolean;
  sort?: number;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: string | null;
}

export const useCategories = (publicTenantId?: string) => {
  const { user } = useAuth();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const tenantId = publicTenantId || currentTenantId;
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (publicTenantId || (tenantId && !tenantLoading)) {
      loadCategories();
    }
  }, [tenantId, tenantLoading, publicTenantId]);

  // Cross-instance sync: this hook keeps local state per component, so when one
  // copy mutates (e.g. the Categorías modal creates one) every other copy (e.g.
  // the category selector inside the open product form) refetches too.
  useEffect(() => {
    const onChanged = () => loadCategories();
    window.addEventListener('toogo:categories-changed', onChanged);
    return () => window.removeEventListener('toogo:categories-changed', onChanged);
  }, [tenantId, publicTenantId]);

  const notifyCategoriesChanged = () => {
    window.dispatchEvent(new CustomEvent('toogo:categories-changed'));
  };

  const loadCategories = async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort', { ascending: true });

      if (error) throw error;


      // Map database fields to component format
      const mappedCategories = (data || []).map(category => ({
        ...category,
        showOnHome: category.show_on_home,
        parent_id: category.parent_id
      }));

      setCategories(mappedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Only show toast for authenticated users
      if (user) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las categorías",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategory = async (categoryData: Omit<Category, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>, editingCategoryId?: string) => {
    if (!user || !tenantId) return false;

    try {
      const categoryId = editingCategoryId || crypto.randomUUID();

      const { error } = await supabase
        .from('categories')
        .upsert({
          id: categoryId,
          tenant_id: tenantId,
          name: categoryData.name,
          slug: categoryData.slug,
          show_on_home: categoryData.showOnHome || true,
          sort: categoryData.sort || 0,
          parent_id: categoryData.parent_id
        });

      if (error) throw error;

      await loadCategories(); // Reload categories after save
      notifyCategoriesChanged();

      toast({
        title: editingCategoryId ? "Categoría actualizada" : "Categoría creada",
        description: editingCategoryId ? "La categoría se ha actualizado correctamente." : "La categoría se ha agregado.",
      });

      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la categoría",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user || !tenantId) return false;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await loadCategories(); // Reload categories after delete
      notifyCategoriesChanged();

      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleShowOnHome = async (categoryId: string) => {
    if (!user || !tenantId) return false;

    try {
      // Find the category to toggle
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) return false;

      const { error } = await supabase
        .from('categories')
        .update({
          show_on_home: !category.showOnHome
        })
        .eq('id', categoryId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await loadCategories(); // Reload categories after toggle
      notifyCategoriesChanged();

      toast({
        title: category.showOnHome ? "Categoría ocultada" : "Categoría mostrada",
        description: category.showOnHome
          ? "La categoría ya no aparecerá en el catálogo"
          : "La categoría ahora aparece en el catálogo",
      });

      return true;
    } catch (error) {
      console.error('Error toggling category visibility:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la visibilidad de la categoría",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    categories,
    isLoading,
    loadCategories,
    saveCategory,
    deleteCategory,
    toggleShowOnHome
  };
};