import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';

export const useOnboardingInteraction = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTenantId } = useTenantContext();

  const updateOnboardingStep = useCallback(async (updates: Record<string, boolean>): Promise<boolean> => {
    if (!user) {
      console.error('No user found');
      return false;
    }

    try {
      let tenantId = currentTenantId;

      // Fallback: get tenant from user_roles if not in context
      if (!tenantId) {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (rolesError || !userRoles?.tenant_id) {
          console.error('No tenant found for user');
          toast({
            title: 'Error',
            description: 'No se pudo encontrar tu tienda.',
            variant: 'destructive'
          });
          return false;
        }

        tenantId = userRoles.tenant_id;
      }

      // Update the onboarding progress
      const { error } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          tenant_id: tenantId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) {
        console.error('Error updating onboarding progress:', error);
        toast({
          title: 'Error al actualizar',
          description: 'No se pudo guardar el progreso. Revisa tus permisos.',
          variant: 'destructive'
        });
        return false;
      }

      console.log('Onboarding step updated successfully:', updates);
      return true;
    } catch (error) {
      console.error('Error in updateOnboardingStep:', error);
      toast({
        title: 'Error inesperado',
        description: 'Ocurrió un problema al guardar el progreso.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, currentTenantId, toast]);

  const markCustomizeStoreCompleted = useCallback(async () => {
    return await updateOnboardingStep({ step_1_logo: true });
  }, [updateOnboardingStep]);

  const markCategoryStepCompleted = useCallback(async () => {
    return await updateOnboardingStep({ step_2_products: true });
  }, [updateOnboardingStep]);

  const markProductStepCompleted = useCallback(async () => {
    return await updateOnboardingStep({ step_3_branding: true });
  }, [updateOnboardingStep]);

  const markPublishConfirmed = useCallback(async () => {
    return await updateOnboardingStep({ step_5_confirmed: true });
  }, [updateOnboardingStep]);

  return {
    markCustomizeStoreCompleted,
    markCategoryStepCompleted,
    markProductStepCompleted,
    markPublishConfirmed
  };
};