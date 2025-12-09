import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useTenantContext } from '@/contexts/TenantContext';

interface OnboardingProgress {
  step_1_logo: boolean;
  step_2_products: boolean;
  step_3_branding: boolean;
  step_4_payments: boolean;
  step_5_publish: boolean;
  step_5_confirmed: boolean;
  total_progress: number;
}

interface OnboardingData {
  progress: OnboardingProgress | null;
  stats: {
    products: number;
    categories: number;
    hasLogo: boolean;
    hasPayments: boolean;
    canPublish: boolean;
  };
  loading: boolean;
  error: string | null;
  tenantId: string | null;
}

export const useOnboardingProgress = () => {
  const { user } = useAuth();
  const { currentTenantId } = useTenantContext();
  const [data, setData] = useState<OnboardingData>({
    progress: null,
    stats: {
      products: 0,
      categories: 0,
      hasLogo: false,
      hasPayments: false,
      canPublish: false,
    },
    loading: true,
    error: null,
    tenantId: null,
  });

  const fetchOnboardingData = async () => {
    try {
      if (!user) {
        setData(prev => ({ ...prev, loading: false, error: 'No user found' }));
        return;
      }

      // Get user's tenant
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (rolesError || !userRoles?.tenant_id) {
        setData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'No tenant found for user',
          tenantId: null 
        }));
        return;
      }

      const tenantId = currentTenantId ?? userRoles.tenant_id;

      // Fetch all data in parallel
      const [
        { count: productsCount },
        { count: categoriesCount },
        { data: tenantSettings },
        { data: progressData }
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        supabase
          .from('tenant_settings')
          .select('logo_url, primary_color, secondary_color, mercadopago_public_key, paypal_client_id, whatsapp_number')
          .eq('tenant_id', tenantId)
          .single(),
        
        supabase
          .from('user_onboarding_progress')
          .select('*')
          .eq('tenant_id', tenantId)
          .single()
      ]);

      // Calculate verification statuses
      const hasPayments = !!(
        tenantSettings?.mercadopago_public_key || 
        tenantSettings?.paypal_client_id || 
        tenantSettings?.whatsapp_number
      );
      const hasLogo = !!(tenantSettings?.logo_url);
      
      // Auto-detect steps based on actual data existence
      const currentProgress: OnboardingProgress = {
        step_1_logo: hasLogo, // Auto-detect if logo exists
        step_2_products: (categoriesCount || 0) > 0, // Auto-detect if categories exist
        step_3_branding: (productsCount || 0) > 0, // Auto-detect if products exist
        step_4_payments: hasPayments, // Auto-detect if payments configured
        step_5_publish: false, // Will be calculated below
        step_5_confirmed: progressData?.step_5_confirmed || false, // Read from DB but won't be updated here
        total_progress: 0 // Will be calculated below
      };

      // Calculate publish step based on completion of other steps
      const stepsCompleted = [
        currentProgress.step_1_logo,
        currentProgress.step_2_products,
        currentProgress.step_3_branding,
        currentProgress.step_4_payments
      ];
      
      currentProgress.step_5_publish = stepsCompleted.every(Boolean);
      currentProgress.total_progress = [...stepsCompleted, currentProgress.step_5_publish].filter(Boolean).length;

      // ALWAYS overwrite progress with calculated values (auto-corrects outdated data)
      // EXCEPT step_5_confirmed which is only set when user clicks "Ver Tienda"
      // Extract step_5_confirmed to avoid overwriting it
      const { step_5_confirmed, ...progressToUpdate } = currentProgress;
      
      await supabase
        .from('user_onboarding_progress')
        .upsert({
          tenant_id: tenantId,
          ...progressToUpdate,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      setData({
        progress: currentProgress,
        stats: {
          products: productsCount || 0,
          categories: categoriesCount || 0,
          hasLogo: !!(tenantSettings?.logo_url),
          hasPayments,
          canPublish: currentProgress.step_5_publish
        },
        loading: false,
        error: null,
        tenantId
      });

    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Error loading onboarding data' 
      }));
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, [user]);

  // Real-time subscription to onboarding progress changes
  useEffect(() => {
    if (!user || !data.tenantId) return;

    const channel = supabase
      .channel('onboarding-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `tenant_id=eq.${data.tenantId}`
        },
        () => {
          console.log('Products changed, refreshing onboarding...');
          fetchOnboardingData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `tenant_id=eq.${data.tenantId}`
        },
        () => {
          console.log('Categories changed, refreshing onboarding...');
          fetchOnboardingData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tenant_settings',
          filter: `tenant_id=eq.${data.tenantId}`
        },
        () => {
          console.log('Tenant settings changed, refreshing onboarding...');
          fetchOnboardingData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_onboarding_progress',
          filter: `tenant_id=eq.${data.tenantId}`
        },
        () => {
          console.log('Onboarding progress changed, refreshing...');
          fetchOnboardingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, data.tenantId]);

  const refreshProgress = () => {
    setData(prev => ({ ...prev, loading: true }));
    fetchOnboardingData();
  };

  return {
    ...data,
    refreshProgress
  };
};