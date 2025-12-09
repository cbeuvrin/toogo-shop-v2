import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useTenantByDomain } from '@/hooks/useTenantByDomain';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_STORE_ID } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type PlanType = Database['public']['Enums']['plan_type'];

interface Tenant {
  id: string;
  name: string;
  plan?: PlanType | 'pro';
  primary_host?: string;
}

// Helper to safely cast plan
const safelyCastPlan = (plan: string): PlanType | 'pro' => {
  if (['free', 'basic', 'premium', 'pro'].includes(plan)) {
    return plan as PlanType | 'pro';
  }
  return 'free';
};

interface TenantContextType {
  currentTenantId: string | null;
  availableTenants: Tenant[];
  setCurrentTenantId: (tenantId: string) => void;
  isLoading: boolean;
  userRole: AppRole | string | null; // Allow string for flexibility if DB has other values
  isSuperAdmin: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

interface RoleCacheData {
  role: AppRole | string | null;
  isSuperAdmin: boolean;
  tenants: Tenant[];
  currentTenantId: string | null;
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const { user } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const { tenant: domainTenant, isLoading: domainLoading } = useTenantByDomain();

  if (process.env.NODE_ENV !== 'production') {
    console.log('🏪 [TenantContext] Estado actual:', {
      user: user?.id || 'no auth',
      tenantId,
      domainTenant: domainTenant ? { id: domainTenant.id, name: domainTenant.name } : null,
      tenantLoading,
      domainLoading,
      timestamp: new Date().toISOString()
    });
  }
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [userRole, setUserRole] = useState<AppRole | string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🏪 [TenantContext] useEffect principal ejecutándose:', {
        user: !!user,
        tenantLoading,
        domainLoading,
        domainTenant: domainTenant ? { id: domainTenant.id, name: domainTenant.name } : null
      });
    }

    // Evitar ejecución si aún estamos cargando
    if (tenantLoading || domainLoading) {
      return;
    }

    if (user) {
      console.log('🏪 [TenantContext] Usuario autenticado detectado, cargando roles y tenants');
      // Verificar cache de roles primero
      const cachedRole = localStorage.getItem(`user-role-${user.id}`);
      const cachedTimestamp = localStorage.getItem(`user-role-timestamp-${user.id}`);
      const now = Date.now();
      const ROLE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (reduced from 10 for security)

      if (cachedRole && cachedTimestamp && (now - parseInt(cachedTimestamp)) < ROLE_CACHE_TTL) {
        console.log('💾 [TenantContext] Usando roles desde cache');
        try {
          const roleData = JSON.parse(cachedRole) as RoleCacheData;
          setUserRole(roleData.role);
          setIsSuperAdmin(roleData.isSuperAdmin);
          setAvailableTenants(roleData.tenants);
          setCurrentTenantId(roleData.currentTenantId);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing cached role data:', error);
          // Continue with normal flow if cache is corrupted
        }
      }

      loadUserTenantsAndRoles();
    } else {
      console.log('🏪 [TenantContext] Usuario NO autenticado, procesando tenant de dominio');

      // For unauthenticated users, prioritize domain-specific tenant
      if (domainTenant) {
        console.log('✅ [TenantContext] Tenant de dominio encontrado para usuario no auth:', {
          id: domainTenant.id,
          name: domainTenant.name,
          primary_host: domainTenant.primary_host
        });
        setCurrentTenantId(domainTenant.id);
        setAvailableTenants([{ id: domainTenant.id, name: domainTenant.name, plan: (domainTenant as any).plan || 'free' }]);
      } else {
        // Fallback to Demo Store only if no domain tenant is found
        console.log('❌ [TenantContext] No domain tenant found, usando Demo Store como fallback');
        setCurrentTenantId(DEMO_STORE_ID);
        setAvailableTenants([{ id: DEMO_STORE_ID, name: 'Demo Store' }]);
      }
      setUserRole(null);
      setIsSuperAdmin(false);
      setIsLoading(false);
    }
  }, [user, tenantLoading, domainTenant, domainLoading]);

  useEffect(() => {
    // For regular users, use tenantId from useTenant
    if (!isSuperAdmin && tenantId && !currentTenantId) {
      console.log('Setting tenant for regular user:', tenantId);
      setCurrentTenantId(tenantId);
    }
  }, [tenantId, currentTenantId, isSuperAdmin]);

  const loadUserTenantsAndRoles = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get all user roles
      // Type assertion for the complex join result
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, tenant_id, tenants(id, name, plan, primary_host)')
        .eq('user_id', user.id);

      if (rolesError) {
        // Handle 403 errors gracefully - user might not have roles yet during onboarding
        if (rolesError.message?.includes('403') || rolesError.code === 'PGRST301') {
          console.log('No roles found for user (403 - user not yet assigned roles)');
          setUserRole(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }
        console.error('Error loading user roles:', rolesError);
        setIsLoading(false);
        return;
      }

      if (!userRoles || userRoles.length === 0) {
        console.log('No roles found for user');
        setUserRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      // Check if user is superadmin
      const superAdminRole = userRoles.find(role => role.role === 'superadmin');
      const isSuperAdminUser = !!superAdminRole;
      setIsSuperAdmin(isSuperAdminUser);

      if (isSuperAdminUser) {
        // Superadmin: Load ALL tenants to allow "View As" functionality
        // We limit to 50 for initial load to avoid performance issues, 
        // full search should be implemented in the selector if needed.
        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, name, plan, primary_host')
          .order('name');

        if (tenantsError) {
          console.error('Error loading tenants for superadmin:', tenantsError);
          // Fallback to Demo Store
          const { data: demoStore } = await supabase
            .from('tenants')
            .select('id, name, plan, primary_host')
            .eq('id', DEMO_STORE_ID)
            .maybeSingle();

          if (demoStore) {
            setAvailableTenants([{ id: demoStore.id, name: demoStore.name, plan: demoStore.plan || 'free', primary_host: demoStore.primary_host }]);
            setCurrentTenantId(demoStore.id);
          }
        } else {
          const mappedTenants: Tenant[] = allTenants.map(t => ({
            id: t.id,
            name: t.name,
            plan: t.plan || 'free',
            primary_host: t.primary_host
          }));
          setAvailableTenants(mappedTenants);

          // Try to restore selected tenant from localStorage, otherwise default to Demo Store or first one
          const savedTenantId = localStorage.getItem('selectedTenantId');
          const targetTenant = mappedTenants.find(t => t.id === savedTenantId);
          const demoStore = mappedTenants.find(t => t.id === DEMO_STORE_ID);

          if (targetTenant) {
            setCurrentTenantId(targetTenant.id);
          } else if (demoStore) {
            setCurrentTenantId(demoStore.id);
          } else if (mappedTenants.length > 0) {
            setCurrentTenantId(mappedTenants[0].id);
          }
        }

        setUserRole('superadmin');

        // Cache superadmin data (including the full tenant list for now)
        // CAUTION: If tenant list grows large, we should not cache it all here or use pagination.
        const cacheData: RoleCacheData = {
          role: 'superadmin',
          isSuperAdmin: true,
          tenants: availableTenants, // This will be updated on next render, but for cache we might miss it in this closure. 
          // Better to use the local variable 'mappedTenants' if available.
          currentTenantId: currentTenantId // Same caveat, use local variable logic.
        };
        // We skip strict caching of the big list here to avoid complexity in this closure, 
        // relying on re-fetch or let's just cache user role status.
        localStorage.setItem(`user-role-${user.id}`, JSON.stringify({
          role: 'superadmin',
          isSuperAdmin: true,
          // Don't cache the huge list of tenants to localStorage to avoid quota issues
          tenants: [],
          currentTenantId: null
        }));
        localStorage.setItem(`user-role-timestamp-${user.id}`, Date.now().toString());
      } else {
        // Regular user: only their assigned tenants
        // Need to cast userRoles to access the joined 'tenants' property safely
        const typedUserRoles = userRoles as Array<{
          role: AppRole;
          tenant_id: string | null;
          tenants: { id: string; name: string; plan: PlanType; primary_host: string } | null | { id: string; name: string; plan: PlanType; primary_host: string }[];
        }>;

        const userTenants = await Promise.all(
          typedUserRoles
            .filter(role => role.tenants && role.tenant_id)
            .map(async (role): Promise<Tenant | null> => {
              // Handle case where join might return array or single object (Supabase client behavior varies)
              const tenantDataRaw = Array.isArray(role.tenants) ? role.tenants[0] : role.tenants;

              if (!tenantDataRaw) return null;

              let plan = tenantDataRaw.plan;

              // Si el JOIN no trajo el plan, consultar directamente la tabla tenants
              if (!plan) {
                const { data: tenantData } = await supabase
                  .from('tenants')
                  .select('plan')
                  .eq('id', role.tenant_id!)
                  .maybeSingle();
                plan = tenantData?.plan || 'free';
              }

              // Validar si tiene suscripción activa (significa que es Basic)
              const { data: activeSub } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('tenant_id', role.tenant_id!)
                .eq('status', 'active')
                .maybeSingle();

              // Si hay suscripción activa, forzar plan 'basic'
              if (activeSub) {
                plan = 'basic';
              }

              return {
                id: role.tenant_id!,
                name: tenantDataRaw.name || 'Unnamed Tenant',
                plan: plan,
                primary_host: tenantDataRaw.primary_host
              };
            })
        );

        const validUserTenants = userTenants.filter((t): t is Tenant => t !== null);

        setAvailableTenants(validUserTenants);

        // Set primary tenant (prioritize domain match, then non-demo, then first available)
        if (validUserTenants.length > 0) {
          let targetTenantId = validUserTenants[0].id;

          // 1. If we are on a specific subdomain (tenantId is set), try to match it
          const domainMatch = tenantId ? validUserTenants.find(t => t.id === tenantId) : null;

          if (domainMatch) {
            targetTenantId = domainMatch.id;
          } else {
            // 2. If no domain match, prefer any tenant that is NOT the Demo Store
            const realTenant = validUserTenants.find(t => t.id !== DEMO_STORE_ID);
            if (realTenant) {
              targetTenantId = realTenant.id;
            }
          }

          console.log('Setting initial tenant for regular user:', targetTenantId);
          setCurrentTenantId(targetTenantId);
        }

        // Set user role (take the highest priority role)
        const rolePriority: Record<string, number> = {
          'tenant_admin': 1,
          'tenant_staff': 2,
          'store_manager': 3
        };

        const highestRole = typedUserRoles
          .filter(role => role.role !== 'superadmin')
          .sort((a, b) => {
            const priorityA = rolePriority[a.role] || 999;
            const priorityB = rolePriority[b.role] || 999;
            return priorityA - priorityB;
          })[0];

        const finalRole = highestRole?.role || null;
        setUserRole(finalRole);

        // Cache regular user data
        const cacheData: RoleCacheData = {
          role: finalRole,
          isSuperAdmin: false,
          tenants: validUserTenants,
          currentTenantId: validUserTenants.length > 0 ? validUserTenants[0].id : null
        };
        localStorage.setItem(`user-role-${user.id}`, JSON.stringify(cacheData));
        localStorage.setItem(`user-role-timestamp-${user.id}`, Date.now().toString());
      }
    } catch (error) {
      console.error('Error in loadUserTenantsAndRoles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentTenantId = (tenantId: string) => {
    console.log('Setting current tenant ID:', tenantId);
    setCurrentTenantId(tenantId);
    localStorage.setItem('selectedTenantId', tenantId);
  };

  const value = {
    currentTenantId,
    availableTenants,
    setCurrentTenantId: handleSetCurrentTenantId,
    isLoading,
    userRole,
    isSuperAdmin
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};