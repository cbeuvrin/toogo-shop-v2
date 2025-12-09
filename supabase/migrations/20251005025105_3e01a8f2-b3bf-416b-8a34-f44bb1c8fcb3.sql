-- Fix critical webhook security vulnerability
-- Remove tenant_id IS NULL condition that exposes global webhooks to all tenant admins

-- Drop existing insecure policy
DROP POLICY IF EXISTS "Tenant admins can view webhooks for their tenant" ON public.webhooks;

-- Create secure policy that strictly isolates webhooks by tenant
CREATE POLICY "Tenant admins can view webhooks for their tenant"
ON public.webhooks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);