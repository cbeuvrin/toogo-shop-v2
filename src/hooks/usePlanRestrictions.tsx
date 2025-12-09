import { useMemo } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';

export interface PlanRestrictions {
  // Product limits
  maxProducts: number;
  canUseVariations: boolean;
  
  // Payment methods
  canUseWhatsApp: boolean;
  canUseMercadoPago: boolean;
  canUsePayPal: boolean;
  canUseStripe: boolean;
  
  // Analytics
  hasBasicAnalytics: boolean;
  hasAdvancedAnalytics: boolean;
  
  // Domain configuration
  canUseCustomDomain: boolean;
  canUseSubdomain: boolean;
  
  // Coupons
  canCreateCoupons: boolean;
  maxActiveCoupons: number;
  canUseCouponRestrictions: boolean;
  
  // Other features
  canExportData: boolean;
  hasPrioritySupport: boolean;
}

export const usePlanRestrictions = () => {
  const { availableTenants, currentTenantId, isSuperAdmin } = useTenantContext();

  const currentTenant = useMemo(() => {
    // Guard: asegurar que availableTenants existe y está inicializado
    if (!availableTenants || !Array.isArray(availableTenants) || availableTenants.length === 0) {
      return null;
    }
    if (!currentTenantId) {
      return null;
    }
    return availableTenants.find(t => t?.id === currentTenantId) ?? null;
  }, [availableTenants, currentTenantId]);

  // Detectar si aún estamos cargando/inicializando
  const isInitializing = useMemo(() => {
    return !availableTenants || availableTenants.length === 0;
  }, [availableTenants]);

  // Get plan from tenant data, defaulting to 'free' con validación estricta
  const plan = useMemo(() => {
    if (!currentTenant || !currentTenant.plan) {
      return 'free';
    }
    // Asegurar que el plan es uno de los valores válidos
    const validPlans = ['free', 'basic', 'premium', 'pro'] as const;
    return validPlans.includes(currentTenant.plan as any) ? currentTenant.plan : 'free';
  }, [currentTenant]);

  const restrictions: PlanRestrictions = useMemo(() => {
    // Si es superadmin, habilitar todas las funcionalidades Pro
    if (isSuperAdmin) {
      return {
        maxProducts: Infinity,
        canUseVariations: true,
        canUseWhatsApp: true,
        canUseMercadoPago: true,
        canUsePayPal: true,
        canUseStripe: true,
        hasBasicAnalytics: true,
        hasAdvancedAnalytics: true,
        canUseCustomDomain: true,
        canUseSubdomain: true,
        canCreateCoupons: true,
        maxActiveCoupons: Infinity,
        canUseCouponRestrictions: true,
        canExportData: true,
        hasPrioritySupport: true,
      };
    }

    switch (plan) {
      case 'free':
        return {
          maxProducts: 20,
          canUseVariations: false,
          canUseWhatsApp: true,
          canUseMercadoPago: false,
          canUsePayPal: false,
          canUseStripe: false,
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: false,
          canUseCustomDomain: false,
          canUseSubdomain: true,
          canCreateCoupons: true,
          maxActiveCoupons: 1,
          canUseCouponRestrictions: false,
          canExportData: false,
          hasPrioritySupport: false,
        };
      
      case 'basic':
      case 'pro':
        return {
          maxProducts: Infinity,
          canUseVariations: true,
          canUseWhatsApp: true,
          canUseMercadoPago: true,
          canUsePayPal: true,
          canUseStripe: true,
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: true,
          canUseCustomDomain: true,
          canUseSubdomain: true,
          canCreateCoupons: true,
          maxActiveCoupons: plan === 'basic' ? 5 : Infinity,
          canUseCouponRestrictions: true,
          canExportData: true,
          hasPrioritySupport: true,
        };
      
      default:
        return {
          maxProducts: 20,
          canUseVariations: false,
          canUseWhatsApp: true,
          canUseMercadoPago: false,
          canUsePayPal: false,
          canUseStripe: false,
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: false,
          canUseCustomDomain: false,
          canUseSubdomain: true,
          canCreateCoupons: true,
          maxActiveCoupons: 1,
          canUseCouponRestrictions: false,
          canExportData: false,
          hasPrioritySupport: false,
        };
    }
  }, [plan, isSuperAdmin]);

  const isProductLimitReached = useMemo(() => {
    // This would need to check actual product count
    // For now, returning false as we'd need to integrate with product count
    return false;
  }, []);

  return {
    plan,
    restrictions,
    isProductLimitReached,
    isInitializing,
    // Helper functions
    canAddProduct: () => !isProductLimitReached,
    canUsePaymentMethod: (method: 'whatsapp' | 'mercadopago' | 'paypal' | 'stripe') => {
      switch (method) {
        case 'whatsapp': return restrictions.canUseWhatsApp;
        case 'mercadopago': return restrictions.canUseMercadoPago;
        case 'paypal': return restrictions.canUsePayPal;
        case 'stripe': return restrictions.canUseStripe;
        default: return false;
      }
    },
    getProductLimit: () => restrictions.maxProducts,
    getAnalyticsLevel: () => restrictions.hasAdvancedAnalytics ? 'advanced' : 'basic',
  };
};
