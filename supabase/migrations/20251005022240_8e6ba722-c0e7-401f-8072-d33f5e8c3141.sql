-- Security Fix: Prevent cross-tenant access to customer PII in orders table
-- Drop all existing overlapping policies that create security holes
DROP POLICY IF EXISTS "anonymous_users_cannot_access_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_users_tenant_isolation" ON public.orders;
DROP POLICY IF EXISTS "customers_view_own_orders_only" ON public.orders;
DROP POLICY IF EXISTS "superadmins_manage_all_orders" ON public.orders;
DROP POLICY IF EXISTS "superadmins_view_all_orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_admins_manage_tenant_orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_admins_view_tenant_orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_staff_manage_tenant_orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_staff_view_tenant_orders" ON public.orders;

-- Create explicit SELECT policy - only allow authorized users
CREATE POLICY "orders_select_authorized_only" ON public.orders
FOR SELECT
USING (
  -- Superadmins can see all orders
  has_role(auth.uid(), 'superadmin'::app_role) OR
  -- Tenant admins can see orders for their tenant only
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  -- Tenant staff can see orders for their tenant only
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id) OR
  -- Order owners can see their own orders (only if user_id is set)
  (user_id IS NOT NULL AND user_id = auth.uid())
);

-- Create INSERT policy - only authorized users can create orders
CREATE POLICY "orders_insert_authorized_only" ON public.orders
FOR INSERT
WITH CHECK (
  -- Superadmins can create orders
  has_role(auth.uid(), 'superadmin'::app_role) OR
  -- Tenant admins can create orders for their tenant
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  -- Tenant staff can create orders for their tenant
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id) OR
  -- Users can create their own orders
  (user_id IS NOT NULL AND user_id = auth.uid())
);

-- Create UPDATE policy - only tenant staff and admins can update
CREATE POLICY "orders_update_authorized_only" ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
);

-- Create DELETE policy - only tenant admins and superadmins can delete
CREATE POLICY "orders_delete_authorized_only" ON public.orders
FOR DELETE
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
);