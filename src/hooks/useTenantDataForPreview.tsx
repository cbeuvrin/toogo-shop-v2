import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantPreviewData {
  logo_url?: string;
  name: string;
  primary_host: string;
}

interface StoreDataResponse {
  ok: boolean;
  tenant: {
    name: string;
    primary_host: string;
  };
  settings: {
    logo_url?: string;
  };
}

export const useTenantDataForPreview = () => {
  const [tenantData, setTenantData] = useState<TenantPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        // Get tenant data for djbeuvrin@gmail.com using secure function
        const tenantId = 'c3747435-44ba-4d3c-8ab9-5538d5161671';

        // SECURITY: Use the secure RPC function instead of direct table access
        const { data: storeData, error } = await supabase
          .rpc('get_public_store_data_demo', { p_tenant_id: tenantId });

        if (error) {
          console.error('Error fetching tenant preview data:', error);
          return;
        }

        const typedData = storeData as unknown as StoreDataResponse;

        if (typedData && typedData.ok) {
          const data: TenantPreviewData = {
            name: typedData.tenant.name,
            primary_host: typedData.tenant.primary_host,
            logo_url: typedData.settings?.logo_url || undefined
          };
          setTenantData(data);
        }
      } catch (error) {
        console.error('Error fetching tenant preview data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, []);

  return { tenantData, isLoading };
};