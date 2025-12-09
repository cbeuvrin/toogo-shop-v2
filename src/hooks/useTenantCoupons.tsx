import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantStoreCoupon {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number;
  minimum_purchase_amount?: number;
  applies_to_all_products: boolean;
  applies_to_products?: string[];
  applies_to_categories?: string[];
  max_total_uses?: number;
  max_uses_per_user: number;
  current_uses: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CouponUsageStats {
  total_uses: number;
  total_discount_applied: number;
  unique_users: number;
}

export const useTenantCoupons = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCoupons = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_store_coupons')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantStoreCoupon[];
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cupones',
        variant: 'destructive',
      });
      return [];
    }
  };

  const validateStoreCoupon = async (
    code: string,
    tenantId: string,
    cartItems: any[],
    userId?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-store-coupon', {
        body: {
          code: code.toUpperCase(),
          tenant_id: tenantId,
          cart_items: cartItems,
          user_id: userId,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({
        title: 'Error',
        description: 'No se pudo validar el cupón',
        variant: 'destructive',
      });
      return { valid: false, error: 'Error al validar' };
    } finally {
      setIsLoading(false);
    }
  };

  const createCoupon = async (couponData: Omit<TenantStoreCoupon, 'id' | 'created_at' | 'updated_at' | 'current_uses'>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tenant_store_coupons')
        .insert({
          ...couponData,
          code: couponData.code.toUpperCase(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cupón creado correctamente',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el cupón',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCoupon = async (id: string, updates: Partial<TenantStoreCoupon>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenant_store_coupons')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cupón actualizado correctamente',
      });

      return true;
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el cupón',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenant_store_coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cupón eliminado correctamente',
      });

      return true;
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cupón',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCouponStats = async (couponId: string): Promise<CouponUsageStats | null> => {
    try {
      const { data, error } = await supabase
        .from('tenant_coupon_usage')
        .select('discount_applied, user_id')
        .eq('coupon_id', couponId);

      if (error) throw error;

      const stats: CouponUsageStats = {
        total_uses: data.length,
        total_discount_applied: data.reduce((sum, item) => sum + Number(item.discount_applied), 0),
        unique_users: new Set(data.map(item => item.user_id).filter(Boolean)).size,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching coupon stats:', error);
      return null;
    }
  };

  return {
    isLoading,
    fetchCoupons,
    validateStoreCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponStats,
  };
};
