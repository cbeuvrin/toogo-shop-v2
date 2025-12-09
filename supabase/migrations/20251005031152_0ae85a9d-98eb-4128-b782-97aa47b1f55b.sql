-- Security and Performance Fix (parte 2)
-- Step 1: Audit logging function for customer PII access compliance
CREATE OR REPLACE FUNCTION public.log_customer_pii_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when customer PII is accessed (for compliance)
  INSERT INTO admin_activity_logs (
    admin_user_id,
    action_type,
    target_tenant_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'customer_pii_access',
    NEW.tenant_id,
    'Customer PII accessed for order: ' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_email', NEW.customer_email,
      'accessed_at', now()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 2: Separate tenant_settings RLS policies by operation
-- This fixes the INSERT error and improves security granularity
DROP POLICY IF EXISTS "Tenant admins can manage their settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Tenant admins can view their settings" ON public.tenant_settings;

-- SELECT: Only tenant_admin and superadmin can view settings (includes payment keys)
CREATE POLICY "Tenant admins can view their settings"
ON public.tenant_settings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- INSERT: Allow tenant_admin to create settings (fixes the performance issue)
CREATE POLICY "Tenant admins can insert their settings"
ON public.tenant_settings
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- UPDATE: Allow tenant_admin to update settings
CREATE POLICY "Tenant admins can update their settings"
ON public.tenant_settings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- DELETE: Allow tenant_admin to delete settings
CREATE POLICY "Tenant admins can delete their settings"
ON public.tenant_settings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);