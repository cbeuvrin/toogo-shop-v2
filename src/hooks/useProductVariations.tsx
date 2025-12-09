import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductVariation } from '@/components/dashboard/ProductVariationsManager';

export interface ProductVariationWithDetails {
  id: string;
  product_id: string;
  combination: Record<string, string>;
  stock: number;
  price_modifier: number;
  sku: string | null;
  variable_names?: Record<string, string>;
}

export const useProductVariations = (productId?: string, initialVariations?: ProductVariationWithDetails[]) => {
  const [variations, setVariations] = useState<ProductVariationWithDetails[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);

  const loadVariations = async (id: string) => {
    if (!id) return;
    
    // Si tenemos initialVariations, usarlas en lugar de hacer query
    if (initialVariations && initialVariations.length > 0) {
      setVariations(initialVariations);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get product variations
      const { data: variationsData, error } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', id);

      if (error) throw error;

      const formattedVariations: ProductVariationWithDetails[] = (variationsData || []).map(v => ({
        id: v.id,
        product_id: v.product_id,
        combination: typeof v.combination === 'object' && v.combination !== null ? v.combination as Record<string, string> : {},
        stock: v.stock,
        price_modifier: v.price_modifier,
        sku: v.sku
      }));
      
      setVariations(formattedVariations);
    } catch (error) {
      console.error('Error loading variations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSelectedVariation = (variableName: string, value: string) => {
    const newSelection = { ...selectedVariation, [variableName]: value };
    setSelectedVariation(newSelection);
    
    // Find matching variation
    const matchingVariation = variations.find(variation => {
      return Object.entries(newSelection).every(([key, val]) => 
        variation.combination[key] === val
      );
    });
    
    // IMPORTANTE: price_modifier contiene el PRECIO COMPLETO de la variación,
    // NO es un modificador que se suma al precio base del producto.
    if (matchingVariation) {
      setCurrentPrice(matchingVariation.price_modifier);
      setCurrentStock(matchingVariation.stock);
    }
  };

  const getAvailableOptions = (variableName: string) => {
    const options = new Set<string>();
    variations.forEach(variation => {
      if (variation.combination[variableName]) {
        options.add(variation.combination[variableName]);
      }
    });
    return Array.from(options);
  };

  const isSelectionComplete = (requiredVariables: string[]) => {
    return requiredVariables.every(variable => selectedVariation[variable]);
  };

  const resetSelection = () => {
    setSelectedVariation({});
    setCurrentPrice(0);
    setCurrentStock(0);
  };

  useEffect(() => {
    if (productId) {
      loadVariations(productId);
    }
  }, [productId, initialVariations]);

  return {
    variations,
    selectedVariation,
    currentPrice,
    currentStock,
    isLoading,
    updateSelectedVariation,
    getAvailableOptions,
    isSelectionComplete,
    resetSelection,
    loadVariations
  };
};