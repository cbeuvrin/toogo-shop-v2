-- Solución definitiva para el problema de RLS en user_roles
-- Permitir que los propietarios de tenants puedan crear roles para sus tenants

-- Primero, eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Superadmins can manage all user roles" ON public.user_roles;

-- Crear nuevas políticas más granulares y funcionales
CREATE POLICY "Superadmins can manage all user roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Política crítica: Permitir que los owners de tenants puedan crear roles tenant_admin para sus tenants
CREATE POLICY "Tenant owners can create tenant_admin role for their tenant" ON public.user_roles
FOR INSERT 
WITH CHECK (
  role = 'tenant_admin'::app_role 
  AND user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE id = tenant_id 
    AND owner_user_id = auth.uid()
  )
);

-- Permitir que tenant_admins puedan crear roles para su tenant
CREATE POLICY "Tenant admins can create roles in their tenant" ON public.user_roles
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir que tenant_admins puedan actualizar roles en su tenant
CREATE POLICY "Tenant admins can update roles in their tenant" ON public.user_roles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir que tenant_admins puedan eliminar roles en su tenant
CREATE POLICY "Tenant admins can delete roles in their tenant" ON public.user_roles
FOR DELETE 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);