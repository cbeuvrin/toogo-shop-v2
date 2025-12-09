// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';

export interface ProductVariable {
  id: string;
  tenant_id: string;
  name: string;
  type: 'dropdown' | 'text' | 'color';
  is_required: boolean;
  is_active?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  values?: ProductVariableValue[];
}

export interface ProductVariableValue {
  id: string;
  variable_id: string;
  value: string;
  sort_order: number;
  created_at: string;
}

export interface ProductVariableAssignment {
  id: string;
  product_id: string;
  variable_id: string;
  is_active: boolean;
  created_at: string;
}

export const useProductVariables = () => {
  const [variables, setVariables] = useState<ProductVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const tenantId = currentTenantId;
  const { toast } = useToast();

  useEffect(() => {
    if (user && tenantId && !tenantLoading) {
      loadVariables();
    }
  }, [user, tenantId, tenantLoading]);

  const loadVariables = async () => {
    if (!tenantId) {
      console.log('No tenant ID available for loading variables');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get variables with their values for the current tenant
      const { data: variablesData, error: variablesError } = await supabase
        .from('product_variables')
        .select(`
          *,
          product_variable_values (*)
        `)
        .eq('tenant_id', tenantId)
        .order('sort_order');

      if (variablesError) throw variablesError;

      const formattedVariables: ProductVariable[] = variablesData.map(variable => ({
        id: variable.id,
        tenant_id: variable.tenant_id,
        name: variable.name,
        type: variable.type as 'dropdown' | 'text' | 'color',
        is_required: variable.is_required || false,
        is_active: variable.is_active !== false,
        sort_order: variable.sort_order || 0,
        created_at: variable.created_at,
        updated_at: variable.updated_at,
        values: variable.product_variable_values?.map(v => ({
          id: v.id,
          variable_id: v.variable_id,
          value: v.value,
          sort_order: v.sort_order || 0,
          created_at: v.created_at
        })) || []
      }));

      setVariables(formattedVariables);
    } catch (error) {
      console.error('Error loading variables:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las variables del producto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveVariable = async (variableData: Omit<ProductVariable, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>, editingVariableId?: string) => {
    if (!tenantId) {
      console.error('No tenant ID available for saving variable');
      toast({
        title: "Error",
        description: "No se puede guardar la variable: tenant no disponible",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVariableId) {
        // Update existing variable
        const { error } = await supabase
          .from('product_variables')
          .update({
            name: variableData.name,
            type: variableData.type,
            is_required: variableData.is_required,
            sort_order: variableData.sort_order
          })
          .eq('id', editingVariableId);

        if (error) throw error;
      } else {
        // Create new variable
        const { data, error } = await supabase
          .from('product_variables')
          .insert({
            name: variableData.name,
            type: variableData.type,
            is_required: variableData.is_required,
            sort_order: variableData.sort_order,
            tenant_id: tenantId,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        // Add values if provided
        if (variableData.values && variableData.values.length > 0) {
          const valuesToInsert = variableData.values.map((value, index) => ({
            variable_id: data.id,
            value: value.value,
            sort_order: index
          }));

          const { error: valuesError } = await supabase
            .from('product_variable_values')
            .insert(valuesToInsert);

          if (valuesError) throw valuesError;
        }
      }

      await loadVariables();
      
      toast({
        title: "Éxito",
        description: editingVariableId ? "Variable actualizada correctamente" : "Variable creada correctamente",
      });
    } catch (error) {
      console.error('Error saving variable:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la variable",
        variant: "destructive",
      });
    }
  };

  const deleteVariable = async (variableId: string) => {
    try {
      const { error } = await supabase
        .from('product_variables')
        .delete()
        .eq('id', variableId);

      if (error) throw error;

      await loadVariables();
      
      toast({
        title: "Éxito",
        description: "Variable eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la variable",
        variant: "destructive",
      });
    }
  };

  const saveVariableValues = async (variableId: string, values: string[]) => {
    try {
      // Delete existing values
      await supabase
        .from('product_variable_values')
        .delete()
        .eq('variable_id', variableId);

      // Insert new values
      if (values.length > 0) {
        const valuesToInsert = values.map((value, index) => ({
          variable_id: variableId,
          value: value,
          sort_order: index
        }));

        const { error } = await supabase
          .from('product_variable_values')
          .insert(valuesToInsert);

        if (error) throw error;
      }

      await loadVariables();
      
      toast({
        title: "Éxito",
        description: "Valores de variable actualizados correctamente",
      });
    } catch (error) {
      console.error('Error saving variable values:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los valores de la variable",
        variant: "destructive",
      });
    }
  };

  const getProductVariables = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variable_assignments')
        .select(`
          *,
          product_variables (
            *,
            product_variable_values (*)
          )
        `)
        .eq('product_id', productId)
        .eq('is_active', true);

      if (error) throw error;

      // Filter out inactive variables
      const activeAssignments = (data || []).filter(
        assignment => assignment.product_variables?.is_active !== false
      );

      return activeAssignments.map(assignment => ({
        ...assignment.product_variables,
        values: assignment.product_variables?.product_variable_values || []
      })) || [];
    } catch (error) {
      console.error('Error getting product variables:', error);
      return [];
    }
  }, []);

  const assignVariablesToProduct = async (productId: string, variableIds: string[]) => {
    try {
      // Delete existing assignments
      await supabase
        .from('product_variable_assignments')
        .delete()
        .eq('product_id', productId);

      // Insert new assignments
      if (variableIds.length > 0) {
        const assignmentsToInsert = variableIds.map(variableId => ({
          product_id: productId,
          variable_id: variableId,
          is_active: true
        }));

        const { error } = await supabase
          .from('product_variable_assignments')
          .insert(assignmentsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: "Variables asignadas al producto correctamente",
      });
    } catch (error) {
      console.error('Error assigning variables to product:', error);
      toast({
        title: "Error",
        description: "No se pudieron asignar las variables al producto",
        variant: "destructive",
      });
    }
  };

  const setVariableActive = async (variableId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('product_variables')
        .update({ is_active: isActive })
        .eq('id', variableId);

      if (error) throw error;

      // Reload variables
      await loadVariables();

      toast({
        title: isActive ? "Variable activada" : "Variable archivada",
        description: isActive 
          ? "La variable está ahora disponible para usar en productos."
          : "La variable ha sido archivada y no aparecerá en nuevos productos.",
      });
    } catch (error) {
      console.error('Error updating variable status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la variable",
        variant: "destructive",
      });
    }
  };

  return {
    variables,
    isLoading,
    loadVariables,
    saveVariable,
    deleteVariable,
    saveVariableValues,
    getProductVariables,
    assignVariablesToProduct,
    setVariableActive
  };
};