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

  // Show current tenant name for all users (superadmins now only have Demo Store)
  const currentTenant = availableTenants.find(t => t.id === currentTenantId);
  
  return (
    <div className="flex items-center gap-2">
      {/* Desktop: solo "Ver Tienda" + rol */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ver Tienda</span>
        {userRole && (
          <Badge variant={isSuperAdmin ? "destructive" : "outline"} className="text-xs">
            {userRole === 'tenant_admin' ? 'Admin' : 
             userRole === 'tenant_staff' ? 'Staff' : 
             userRole === 'superadmin' ? 'Super Admin' : userRole}
          </Badge>
        )}
      </div>
    </div>
  );
};