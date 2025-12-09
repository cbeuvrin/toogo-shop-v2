// @ts-nocheck
import { useState, useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export const useTenantUrl = () => {
  const { currentTenantId } = useTenantContext();
  const [tenantUrl, setTenantUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenantUrl = async () => {
      if (!currentTenantId) {
        setTenantUrl(null);
        setIsLoading(false);
        return;
      }

      // Detect if we're in a Lovable preview environment
      const isPreviewDomain = window.location.hostname.includes('lovableproject.com') 
        || window.location.hostname.includes('lovable.app') 
        || window.location.hostname.includes('localhost');

      if (isPreviewDomain) {
        // In preview, use relative path with query param
        setTenantUrl(`/tienda?preview=${currentTenantId}`);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('primary_host')
          .eq('id', currentTenantId)
          .single();

        if (error) {
          console.error('Error fetching tenant URL:', error);
          setTenantUrl(null);
        } else if (data?.primary_host) {
          setTenantUrl(`https://${data.primary_host}`);
        } else {
          setTenantUrl(null);
        }
      } catch (error) {
        console.error('Error fetching tenant URL:', error);
        setTenantUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantUrl();
  }, [currentTenantId]);

  return { tenantUrl, isLoading };
};