import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProductVariablesForSelector } from '@/hooks/useProductVariablesForSelector';
import { useProductVariations } from '@/hooks/useProductVariations';

interface ProductVariationSelectorProps {
  productId: string;
  variations?: any[];
  onPriceChange?: (price: number) => void;
  onStockChange?: (stock: number) => void;
  onVariationComplete?: (isComplete: boolean) => void;
  onVariationChange?: (variation: { id: string; combination: Record<string, string>; stock: number; sku?: string } | null) => void;
}

export const ProductVariationSelector = ({
  productId,
  variations,
  onPriceChange,
  onStockChange,
  onVariationComplete,
  onVariationChange
}: ProductVariationSelectorProps) => {
  const { variables } = useProductVariablesForSelector(productId, variations);
  const {
    selectedVariation,
    currentPrice,
    currentStock,
    updateSelectedVariation,
    isSelectionComplete
  } = useProductVariations(productId, variations);

  useEffect(() => {
    const requiredVariables = variables.filter(v => v.is_required).map(v => v.name);
    const selectionComplete = isSelectionComplete(requiredVariables);

    // Siempre notificar si la selección está completa
    if (onVariationComplete) {
      onVariationComplete(selectionComplete);
    }

    // Si no hay variables (producto simple), no tocar el stock/precio del padre
    if (!variables || variables.length === 0) {
      console.log('📦 [ProductVariationSelector] Producto simple detectado - no modificando stock/precio');
      if (onVariationChange) onVariationChange(null);
      return;
    }

    // Solo propagar precio/stock cuando la selección esté completa
    if (selectionComplete) {
      console.log('📦 [ProductVariationSelector] Selección completa - propagando:', { currentPrice, currentStock });
      if (onPriceChange) onPriceChange(currentPrice);
      if (onStockChange) onStockChange(currentStock);
      
      // Encontrar la variación completa seleccionada
      const matchingVariation = variations?.find(v => {
        const combination = v.combination;
        return Object.keys(selectedVariation).every(
          key => combination[key] === selectedVariation[key]
        );
      });
      
      if (matchingVariation && onVariationChange) {
        onVariationChange({
          id: matchingVariation.id,
          combination: matchingVariation.combination,
          stock: matchingVariation.stock,
          sku: matchingVariation.sku
        });
      }
    } else {
      console.log('📦 [ProductVariationSelector] Selección incompleta - enviando 0');
      if (onPriceChange) onPriceChange(0);
      if (onStockChange) onStockChange(0);
      if (onVariationChange) onVariationChange(null);
    }
  }, [variables, currentPrice, currentStock, isSelectionComplete, onPriceChange, onStockChange, onVariationComplete, onVariationChange, selectedVariation, variations]);

  if (!variables || variables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Opciones del producto</h4>
      
      {variables.map((variable) => (
        <div key={variable.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`variable-${variable.id}`} className="text-sm font-medium">
              {variable.name}
            </Label>
          </div>
          
          <Select
            value={selectedVariation[variable.name] || ''}
            onValueChange={(value) => updateSelectedVariation(variable.name, value)}
          >
            <SelectTrigger id={`variable-${variable.id}`}>
              <SelectValue placeholder={`Selecciona ${variable.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(variable.values || []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};