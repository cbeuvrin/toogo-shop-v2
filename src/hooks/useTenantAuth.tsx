import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useTenantByDomain } from './useTenantByDomain';
import { supabase } from '@/integrations/supabase/client';

interface TenantAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  tenant: any;
  userRole: string | null;
}

export const useTenantAuth = (): TenantAuthResult => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenantByDomain();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setRoleChecked(true);
        return;
      }

      // Check cache first (10 min TTL)
      const cacheKey = `user_role_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { role, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < 10 * 60 * 1000) { // 10 minutes
            console.log('💾 [useTenantAuth] Using cached role:', role);
            setUserRole(role);
            setRoleChecked(true);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }

      try {
        // Fetch ALL user roles for this user
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking user roles:', error);
          setUserRole(null);
          setRoleChecked(true);
          return;
        }

        if (!roles || roles.length === 0) {
          setUserRole(null);
          setRoleChecked(true);
          return;
        }

        // Prioritize roles: superadmin > tenant_admin > tenant_staff
        const rolePriority = {
          'superadmin': 100, // Highest priority
          'tenant_admin': 3,
          'tenant_staff': 2
        };

        // Sort roles by priority
        const sortedRoles = roles.sort((a, b) =>
          (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0)
        );

        // Use the highest priority role
        const highestRole = sortedRoles[0];
        setUserRole(highestRole.role);

        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          role: highestRole.role,
          timestamp: Date.now()
        }));

      } catch (error) {
        console.error('Error checking user roles:', error);
        setUserRole(null);
      } finally {
        setRoleChecked(true);
      }
    };

    if (!authLoading) {
      checkUserRole();
    }
  }, [user, authLoading]);

  const isLoading = authLoading || !roleChecked;

  // Check if we're on a main/dev domain
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isMainDomain = hostname === 'toogo.store' ||
    hostname === 'www.toogo.store' ||
    hostname.includes('lovableproject.com') ||
    hostname.includes('lovable.app') ||
    hostname.includes('localhost');

  // Usuario está autenticado si:
  // 1. Está logueado en Supabase Y
  // 2. Tiene un rol válido Y
  // 3. (Es superadmin) O (tenant_admin/tenant_staff incluso sin tenant en dominios principales)
  const isAuthenticated = !!(
    user &&
    userRole &&
    (
      // Superadmin puede acceder sin tenant
      (userRole === 'superadmin') ||
      // tenant_admin/tenant_staff pueden acceder en dominios principales/dev sin tenant
      ((userRole === 'tenant_admin' || userRole === 'tenant_staff') && (isMainDomain || tenant))
    )
  );

  return {
    isAuthenticated,
    isLoading,
    user,
    tenant,
    userRole
  };
};