import React from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const TenantSelector = () => {
  // Guard against missing TenantProvider to prevent runtime crashes
  let ctx: ReturnType<typeof useTenantContext> | null = null;
  try {
    ctx = useTenantContext();
  } catch (e) {
    // If the provider isn't mounted yet (or due to route nesting), render nothing
    return null;
  }

  const {
    currentTenantId,
    availableTenants,
    setCurrentTenantId,
    isSuperAdmin,
    userRole,
  } = ctx;

  const handleTenantChange = (value: string) => {
    setCurrentTenantId(value);
  };

  const currentTenant = availableTenants.find(t => t.id === currentTenantId);

  if (availableTenants.length <= 1 && !isSuperAdmin) {
    // Single tenant user (and not superadmin), just show the name static
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden md:inline truncate max-w-[150px]">
          {currentTenant?.name}
        </span>
        {userRole && (
          <Badge variant={isSuperAdmin ? "destructive" : "outline"} className="text-xs">
            {userRole === 'tenant_admin' ? 'Admin' :
              userRole === 'tenant_staff' ? 'Staff' :
                userRole === 'superadmin' ? 'Super Admin' : userRole}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentTenantId || ''} onValueChange={handleTenantChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs md:text-sm rounded-[20px] bg-white/50 border-gray-200">
          <SelectValue placeholder="Seleccionar tienda" />
        </SelectTrigger>
        <SelectContent>
          {availableTenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {userRole && (
        <Badge variant={isSuperAdmin ? "destructive" : "outline"} className="text-xs hidden md:inline-flex">
          {userRole === 'tenant_admin' ? 'Admin' :
            userRole === 'tenant_staff' ? 'Staff' :
              userRole === 'superadmin' ? 'Super Admin' : userRole}
        </Badge>
      )}
    </div>
  );
};