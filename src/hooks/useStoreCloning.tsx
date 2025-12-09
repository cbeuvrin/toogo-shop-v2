import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStoreCloning = () => {
  const [isCloning, setIsCloning] = useState(false);
  const { toast } = useToast();

  const cloneStore = async (
    masterTenantId: string,
    newTenantName: string,
    buyerUserId: string,
    primaryHost: string,
    couponId?: string,
    discountAmount?: number
  ) => {
    try {
      setIsCloning(true);

      const { data, error } = await supabase.functions.invoke('clone-tenant-store', {
        body: {
          masterTenantId,
          newTenantName,
          buyerUserId,
          primaryHost,
          couponId,
          discountAmount
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Tienda clonada exitosamente",
        description: `Nueva tienda "${newTenantName}" creada correctamente`,
      });

      return data;
    } catch (error) {
      console.error('Error cloning store:', error);
      toast({
        title: "Error al clonar tienda",
        description: "Hubo un problema al crear la nueva tienda",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCloning(false);
    }
  };

  return {
    cloneStore,
    isCloning
  };
};