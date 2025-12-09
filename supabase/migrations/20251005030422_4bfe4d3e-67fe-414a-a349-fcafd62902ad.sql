-- Fix customer PII exposure in orders table
-- Remove end-user access while maintaining admin/staff functionality

-- Drop existing policy that allows end users to read their own orders
DROP POLICY IF EXISTS "orders_select_strict_ownership" ON public.orders;

-- Create new policy that only allows tenant staff and admins to read orders
CREATE POLICY "orders_select_tenant_staff_only"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role) 
  OR has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
);

-- Note: Edge Functions (create-order, create-customer-checkout) use service_role
-- and bypass RLS, so checkout flow remains functional for end users