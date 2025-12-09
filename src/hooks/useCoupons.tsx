import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount: number | null;
  applicable_to: 'membership' | 'domain' | 'both';
  expires_at: string;
  max_total_uses: number;
  max_uses_per_user: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  error?: string;
  discountAmount?: number;
}

export const useCoupons = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const validateCoupon = async (
    code: string,
    applicableTo: 'membership' | 'domain' | 'both',
    amount: number
  ): Promise<CouponValidationResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isValid: false, error: 'Usuario no autenticado' };
      }

      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { code, userId: user.id, applicableTo, amount },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      return { isValid: false, error: error.message };
    }
  };

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'current_uses'>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          ...couponData,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupón creado',
        description: `El cupón ${couponData.code} ha sido creado exitosamente.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupón actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupón eliminado',
        description: 'El cupón ha sido eliminado exitosamente.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCouponStats = async (couponId: string) => {
    try {
      const { data, error } = await supabase
        .from('coupon_usage')
        .select('*')
        .eq('coupon_id', couponId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  return {
    isLoading,
    fetchCoupons,
    validateCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponStats,
  };
};
