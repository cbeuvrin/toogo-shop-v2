// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export const useTenant = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      getTenantId();
    } else {
      setTenantId(null);
      setIsLoading(false);
    }
  }, [user]);

  const getTenantId = async () => {
    if (!user) return null;

    try {
      setIsLoading(true);
      
      // Get all roles for the user (handles multiple roles)
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .order('role', { ascending: true }); // Order by role for consistent prioritization

      if (error) {
        console.error('Error getting tenant from user_roles:', error);
        // Fallback to user metadata if no role found
        const fallbackTenantId = user.user_metadata?.tenant_id || null;
        setTenantId(fallbackTenantId);
        return fallbackTenantId;
      }

      if (!userRoles || userRoles.length === 0) {
        console.log('No roles found for user');
        const fallbackTenantId = user.user_metadata?.tenant_id || null;
        setTenantId(fallbackTenantId);
        return fallbackTenantId;
      }

      // Check if user is superadmin
      const superAdminRole = userRoles.find(role => role.role === 'superadmin');
      if (superAdminRole) {
        // For superadmins, defer tenant selection to TenantProvider
        setTenantId(null);
        return null;
      }

      // Priority order for non-superadmin roles: tenant_admin > tenant_staff > store_manager
      const rolePriority = {
        tenant_admin: 1,
        tenant_staff: 2,
        store_manager: 3
      } as const;

      // Sort roles by priority and select the highest priority role
      const nonSuperAdminRoles = userRoles.filter(role => role.role !== 'superadmin');
      const sortedRoles = nonSuperAdminRoles.sort((a, b) => {
        const priorityA = (rolePriority as any)[a.role] ?? 999;
        const priorityB = (rolePriority as any)[b.role] ?? 999;
        return priorityA - priorityB;
      });

      const selectedRole = sortedRoles[0];
      console.log('Selected role:', selectedRole);
      
      setTenantId(selectedRole?.tenant_id ?? null);
      return selectedRole?.tenant_id ?? null;
    } catch (error) {
      console.error('Error in getTenantId:', error);
      setTenantId(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    tenantId,
    isLoading,
    getTenantId
  };
};