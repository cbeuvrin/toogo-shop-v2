// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useProductVariables } from './useProductVariables';
import { useTenantContext } from '@/contexts/TenantContext';

export interface ProductVariation {
  id?: string;
  product_id?: string;
  combination: Record<string, string>;
  stock: number;
  price_modifier: number;
  sku?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  sort: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  sale_price_mxn: number;
  price_mxn: number;
  stock: number;
  status: 'active' | 'inactive';
  images: string[];
  sku?: string;
  features: string[];
  product_type: 'simple' | 'variable';
  category_id?: string;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
  variations?: ProductVariation[];
  categories?: Category[];
}

// Helper function to retry operations with auth refresh
const retryWithAuth = async <T,>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Si es error de autenticación y no es el último intento
      if (error?.message?.includes('JWT') && i < maxRetries - 1) {
        console.log('⚠️ Auth error detected, refreshing session...');
        await supabase.auth.refreshSession();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};

export const useProducts = (publicTenantId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const tenantId = publicTenantId || currentTenantId;
  const { toast } = useToast();
  const { assignVariablesToProduct } = useProductVariables();
  useEffect(() => {
    console.log('useProducts effect:', { user: !!user, tenantId, tenantLoading, publicTenantId });
    if (publicTenantId || (tenantId && !tenantLoading)) {
      console.log('Loading products for tenant:', tenantId);
      loadProducts();
    }
  }, [tenantId, tenantLoading, user, publicTenantId]);

  const loadProducts = async () => {
    if (!tenantId) {
      console.log('Cannot load products - missing tenantId:', tenantId);
      setIsLoading(false);
      return;
    }

    console.log('Starting to load products for tenant:', tenantId);
    setIsLoading(true);
    try {
    // Always include variations (RLS policies allow public read access)
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variations (*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw products data:', data);
      console.log('Found', data?.length || 0, 'products for tenant:', tenantId);

      // Convert database products to our interface format
      const formattedProducts: Product[] = (data || []).map((product: any) => {
        const variations = Array.isArray(product.product_variations) 
          ? product.product_variations.map((variation: any) => ({
              id: variation.id,
              product_id: variation.product_id,
              combination: variation.combination,
              stock: variation.stock,
              price_modifier: variation.price_modifier,
              sku: variation.sku
            })) 
          : [];
        
        // Calculate minimum price for variable products
        let displayPrice = product.price_mxn;
        if (product.product_type === 'variable' && variations.length > 0) {
          displayPrice = Math.min(...variations.map(v => v.price_modifier));
        }
        
        return {
          id: product.id,
          title: product.title,
          description: product.description || '',
          sale_price_mxn: product.sale_price_mxn || 0,
          price_mxn: displayPrice,
          stock: product.stock || 0,
          status: product.status === 'active' ? 'active' : 'inactive',
          images: [], // Will be loaded from product_images table
          sku: product.sku || '',
          features: product.features || [],
          product_type: (product.product_type as 'simple' | 'variable') || 'simple',
          category_id: undefined, // Will be loaded from product_categories table
          tenant_id: product.tenant_id,
          created_at: product.created_at,
          updated_at: product.updated_at,
          variations: variations
        };
      });

      // Load images for each product
      for (const product of formattedProducts) {
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', product.id)
          .order('sort', { ascending: true });

        product.images = images?.map(img => img.url) || [];

        // Load categories for each product with full category information
        const { data: productCategories } = await supabase
          .from('product_categories')
          .select(`
            category_id,
            categories (
              id,
              name,
              slug
            )
          `)
          .eq('product_id', product.id);

        if (productCategories && productCategories.length > 0) {
          product.categories = productCategories
            .filter(pc => pc.categories)
            .map(pc => ({
              id: pc.categories.id,
              name: pc.categories.name,
              slug: pc.categories.slug
            }));
          
          // Set the first category as the main category_id for backward compatibility
          if (product.categories.length > 0) {
            product.category_id = product.categories[0].id;
          }
        }
      }

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveProduct = async (productData: Omit<Product, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> & { variables?: string[] }, editingProductId?: string) => {
    if (!user || !tenantId) return false;

    console.log('[saveProduct] Starting save operation', {
      isEditing: !!editingProductId,
      hasUser: !!user,
      tenantId,
      productTitle: productData.title
    });

    try {
      await retryWithAuth(async () => {
        const productId = editingProductId || crypto.randomUUID();
        
        // Generar SKU automático si está vacío (solo para productos simples)
        let finalSKU = productData.sku?.trim() || '';
        if (productData.product_type === 'simple' && !finalSKU) {
          finalSKU = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          console.log('[saveProduct] SKU automático generado:', finalSKU);
        }

      // Save main product data
      const { error: productError } = await supabase
        .from('products')
        .upsert({
          id: productId,
          tenant_id: tenantId,
          title: productData.title,
          description: productData.description,
          sale_price_mxn: productData.sale_price_mxn || 0,
          price_mxn: productData.price_mxn,
          stock: productData.stock,
          status: productData.status,
          sku: productData.product_type === 'variable' ? null : finalSKU,
          features: productData.features,
          product_type: productData.product_type
        });

      if (productError) throw productError;

      // Save images
      if (productData.images.length > 0) {
        // Delete existing images
        await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        // Insert new images
        const imageInserts = productData.images.map((url, index) => ({
          product_id: productId,
          url,
          sort: index
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }

      // Save category association - handle both category_id and categories array
      const categoryId = productData.category_id || (productData.categories && productData.categories[0]);
      
      // Solo insertar si es un UUID válido
      if (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '' && categoryId !== 'undefined') {
        console.log('[saveProduct] Asociando categoría:', categoryId);
        
        // Delete existing category association
        const { error: deleteError } = await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', productId);
          
        if (deleteError) {
          console.error('[saveProduct] Error al eliminar categoría anterior:', deleteError);
        }

        // Insert new category association
        const { error: categoryError } = await supabase
          .from('product_categories')
          .insert({
            product_id: productId,
            category_id: categoryId
          });

        if (categoryError) {
          console.error('[saveProduct] Error al asociar categoría:', categoryError);
          throw new Error(`Error al asociar categoría: ${categoryError.message}`);
        }
      } else {
        console.log('[saveProduct] No se asociará categoría (categoryId inválido o vacío)');
      }

      // Handle variations for variable products using safe RPC function
      if (productData.product_type === 'variable' && productData.variations && productData.variations.length > 0) {
        // Use RPC function that handles upsert safely (preserves variations with orders)
        const variationsPayload = productData.variations.map(v => ({
          combination: v.combination, // Pass as object, not stringified
          stock: v.stock,
          price_modifier: v.price_modifier,
          sku: v.sku || ''
        }));
        
        console.log('[saveProduct] Enviando variaciones a RPC:', variationsPayload);
        
        const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_product_variations', {
          p_product_id: productId,
          p_variations: variationsPayload
        });
        
        if (rpcError) {
          console.error('[saveProduct] Error en upsert_product_variations:', rpcError);
          // No throw - permitir que el producto se guarde aunque las variaciones fallen
        } else {
          console.log('[saveProduct] Variaciones actualizadas:', rpcResult);
        }
      } else if (productData.product_type === 'simple') {
        // For simple products, try to clean up variations (non-critical)
        try {
          // Get all variations for this product
          const { data: allVariations } = await supabase
            .from('product_variations')
            .select('id')
            .eq('product_id', productId);
          
          if (allVariations && allVariations.length > 0) {
            // Get variations that have orders (protected)
            const { data: ordersWithVariations } = await supabase
              .from('order_items')
              .select('variation_id')
              .in('variation_id', allVariations.map(v => v.id));
            
            const protectedIds = new Set(ordersWithVariations?.map(o => o.variation_id).filter(Boolean) || []);
            
            // Delete only unprotected variations
            const toDelete = allVariations.filter(v => !protectedIds.has(v.id)).map(v => v.id);
            
            if (toDelete.length > 0) {
              await supabase
                .from('product_variations')
                .delete()
                .in('id', toDelete);
            }
          }
        } catch (cleanupError) {
          console.warn('[saveProduct] Non-critical: Could not clean up variations:', cleanupError);
        }
      }

        // Assign variables to product if provided
        if (productData.variables && productData.variables.length > 0) {
          await assignVariablesToProduct(productId, productData.variables);
        }

        await loadProducts(); // Reload products after save

        toast({
          title: editingProductId ? "Producto actualizado" : "Producto creado",
          description: editingProductId ? "El producto se ha actualizado correctamente." : "El producto se ha agregado a tu catálogo.",
        });
      });

      return true;
    } catch (error: any) {
      console.error('[saveProduct] Error completo:', error);
      
      let errorMessage = "No se pudo guardar el producto";
      let errorDescription = "";
      
      if (error.code === '23505' && error.message?.includes('products_tenant_id_sku_key')) {
        errorMessage = "SKU duplicado";
        errorDescription = "Ya existe otro producto con este SKU. Por favor usa uno diferente o déjalo vacío para generar uno automático.";
      } else if (error.code === '23503') {
        errorMessage = "Error de categoría";
        errorDescription = "La categoría seleccionada no es válida.";
      } else if (error.message?.includes('JWT') || error.code === 'PGRST301') {
        errorMessage = "Sesión expirada";
        errorDescription = "Por favor recarga la página e intenta de nuevo.";
      } else if (error.code === 'PGRST116') {
        errorMessage = "Error de permisos";
        errorDescription = "No tienes permisos para realizar esta acción.";
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive"
      });
      
      return false;
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user || !tenantId) return false;

    try {
      // Delete from main products table (cascade will handle related tables)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await loadProducts(); // Reload products after delete

      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado del catálogo.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    products,
    isLoading,
    loadProducts,
    saveProduct,
    deleteProduct
  };
};