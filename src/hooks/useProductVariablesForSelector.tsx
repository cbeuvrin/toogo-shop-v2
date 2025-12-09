import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariableForSelector {
  id: string;
  name: string;
  type: string;
  is_required: boolean;
  values: string[];
}

export const useProductVariablesForSelector = (productId?: string, variations?: any[]) => {
  const [variables, setVariables] = useState<ProductVariableForSelector[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadVariables = async (id: string) => {
    if (!id) return;
    
    // Si tenemos variations, derivar variables desde ahí
    if (variations && variations.length > 0) {
      const variablesMap = new Map<string, Set<string>>();
      
      // Extraer todas las variables y sus valores desde las combinations
      variations.forEach(variation => {
        if (variation.combination && typeof variation.combination === 'object') {
          Object.entries(variation.combination).forEach(([key, value]) => {
            if (!variablesMap.has(key)) {
              variablesMap.set(key, new Set());
            }
            variablesMap.get(key)!.add(String(value));
          });
        }
      });
      
      // Convertir a formato ProductVariableForSelector
      const derivedVariables: ProductVariableForSelector[] = Array.from(variablesMap.entries()).map(([name, valuesSet]) => ({
        id: name, // Usar el nombre como ID temporal
        name: name,
        type: 'select',
        is_required: true, // Asumimos que todas son requeridas
        values: Array.from(valuesSet)
      }));
      
      setVariables(derivedVariables);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get product variables through assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('product_variable_assignments')
        .select(`
          variable_id,
          product_variables!inner(
            id,
            name,
            type,
            is_required
          )
        `)
        .eq('product_id', id)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setVariables([]);
        return;
      }

      // Get variable values for each variable
      const variableIds = assignments.map(a => a.variable_id);
      const { data: values, error: valuesError } = await supabase
        .from('product_variable_values')
        .select('variable_id, value')
        .in('variable_id', variableIds)
        .order('sort_order');

      if (valuesError) throw valuesError;

      // Format the data
      const formattedVariables: ProductVariableForSelector[] = assignments.map(assignment => {
        const variable = assignment.product_variables;
        const variableValues = (values || [])
          .filter(v => v.variable_id === assignment.variable_id)
          .map(v => v.value);

        return {
          id: variable.id,
          name: variable.name,
          type: variable.type,
          is_required: variable.is_required,
          values: variableValues
        };
      });

      setVariables(formattedVariables);
    } catch (error) {
      console.error('Error loading product variables:', error);
      setVariables([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadVariables(productId);
    }
  }, [productId, variations]);

  return {
    variables,
    isLoading,
    loadVariables
  };
};