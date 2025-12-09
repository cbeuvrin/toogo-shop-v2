import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductVariable } from '@/hooks/useProductVariables';

export interface ProductVariation {
  id?: string;
  combination: Record<string, string>;
  stock: number;
  price_modifier: number;
  sku: string;
}

interface ProductVariationsManagerProps {
  variables: ProductVariable[];
  selectedVariables: string[];
  variations: ProductVariation[];
  onVariationsChange: (variations: ProductVariation[]) => void;
}

export const ProductVariationsManager = ({
  variables,
  selectedVariables,
  variations,
  onVariationsChange
}: ProductVariationsManagerProps) => {
  const [generatedCombinations, setGeneratedCombinations] = useState<ProductVariation[]>([]);
  const lastSelectedVarsRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Memoize selected variable data to prevent unnecessary recalculations
  const selectedVariableData = useMemo(() => {
    return variables.filter(v => selectedVariables.includes(v.id));
  }, [variables, selectedVariables]);

  // Memoize the key for comparison
  const selectedVarsKey = useMemo(() => {
    return selectedVariables.sort().join(',') + '|' + 
      selectedVariableData.map(v => `${v.id}:${v.values?.map(val => val.value).join(',')}`).join(';');
  }, [selectedVariables, selectedVariableData]);

  // Generate combinations function - memoized
  const generateCombinations = useCallback((vars: ProductVariable[]): Record<string, string>[] => {
    if (vars.length === 0) return [{}];
    
    const [first, ...rest] = vars;
    const restCombinations = generateCombinations(rest);
    const combinations: Record<string, string>[] = [];
    
    first.values?.forEach(value => {
      restCombinations.forEach(restCombo => {
        combinations.push({
          [first.name]: value.value,
          ...restCombo
        });
      });
    });
    
    return combinations;
  }, []);

  // Generate all possible combinations - only when selectedVariables actually change
  useEffect(() => {
    // Skip if nothing changed
    if (lastSelectedVarsRef.current === selectedVarsKey && isInitializedRef.current) {
      return;
    }
    
    lastSelectedVarsRef.current = selectedVarsKey;
    isInitializedRef.current = true;

    if (selectedVariableData.length === 0) {
      if (generatedCombinations.length > 0) {
        setGeneratedCombinations([]);
        onVariationsChange([]);
      }
      return;
    }

    const combinations = generateCombinations(selectedVariableData);
    const newVariations = combinations.map(combination => {
      const combinationKey = JSON.stringify(combination);
      // Check if this combination already exists in variations or generated
      const existingVariation = variations.find(v => 
        JSON.stringify(v.combination) === combinationKey
      ) || generatedCombinations.find(v => 
        JSON.stringify(v.combination) === combinationKey
      );
      
      return existingVariation || {
        combination,
        stock: 0,
        price_modifier: 0,
        sku: ''
      };
    });
    
    setGeneratedCombinations(newVariations);
    onVariationsChange(newVariations);
  }, [selectedVarsKey, selectedVariableData, generateCombinations, onVariationsChange]);

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...generatedCombinations];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedCombinations(updated);
    onVariationsChange(updated);
  };

  const getCombinationLabel = (combination: Record<string, string>) => {
    return Object.entries(combination)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  if (selectedVariables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variaciones del Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Selecciona variables arriba para generar combinaciones automáticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variaciones del Producto</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configurar stock y precios para cada combinación de variables
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {generatedCombinations.map((variation, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
              <div className="col-span-4 md:col-span-1">
                <Label className="text-sm font-medium">
                  {getCombinationLabel(variation.combination)}
                </Label>
              </div>
              
              <div>
                <Label htmlFor={`stock-${index}`} className="text-sm">Stock</Label>
                <Input
                  id={`stock-${index}`}
                  type="number"
                  min="0"
                  value={variation.stock}
                  onChange={(e) => updateVariation(index, 'stock', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`price-${index}`} className="text-sm">Precio +/-</Label>
                <Input
                  id={`price-${index}`}
                  type="number"
                  step="0.01"
                  value={variation.price_modifier}
                  onChange={(e) => updateVariation(index, 'price_modifier', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor={`sku-${index}`} className="text-sm">SKU</Label>
                <Input
                  id={`sku-${index}`}
                  type="text"
                  value={variation.sku}
                  onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                  className="mt-1"
                  placeholder="Opcional"
                />
              </div>
            </div>
          ))}
          
          {generatedCombinations.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Stock total:</strong> {generatedCombinations.reduce((sum, v) => sum + v.stock, 0)} unidades
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};