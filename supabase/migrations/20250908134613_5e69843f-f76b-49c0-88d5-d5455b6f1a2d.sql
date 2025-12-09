-- Fix security issue: Restrict access to customer personal information in orders table
-- Current issue: Any user in a tenant can see all orders including other customers' personal data

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view orders in their tenant" ON orders;

-- Create more restrictive SELECT policy
-- Only allow: 1) Order owner, 2) Tenant staff/admins, 3) Superadmins
CREATE POLICY "Restricted order access for customer privacy" 
ON orders 
FOR SELECT 
USING (
  -- User can see their own orders
  (user_id = auth.uid()) 
  OR 
  -- Tenant staff/admins can see orders in their tenant for management
  (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id))
  OR 
  -- Superadmins can see all orders
  (has_role(auth.uid(), 'superadmin'::app_role))
);