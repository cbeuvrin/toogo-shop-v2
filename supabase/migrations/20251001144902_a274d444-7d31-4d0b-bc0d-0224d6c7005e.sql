-- Fix: Add stricter RLS policies for orders table to protect customer PII
-- This ensures customer personal information is only accessible by authorized users

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Restricted order access for customer privacy" ON orders;
DROP POLICY IF EXISTS "Tenant users can manage orders" ON orders;

-- Policy 1: Customers can ONLY view their own orders
CREATE POLICY "customers_view_own_orders_only"
ON orders
FOR SELECT
TO authenticated
USING (
  user_id IS NOT NULL 
  AND user_id = auth.uid()
);

-- Policy 2: Tenant admins can view orders in their tenant
CREATE POLICY "tenant_admins_view_tenant_orders"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
);

-- Policy 3: Tenant staff can view orders in their tenant
CREATE POLICY "tenant_staff_view_tenant_orders"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
);

-- Policy 4: Superadmins can view all orders
CREATE POLICY "superadmins_view_all_orders"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Policy 5: Tenant admins can manage (INSERT, UPDATE, DELETE) orders in their tenant
CREATE POLICY "tenant_admins_manage_tenant_orders"
ON orders
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
);

-- Policy 6: Tenant staff can manage orders in their tenant
CREATE POLICY "tenant_staff_manage_tenant_orders"
ON orders
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
);

-- Policy 7: Superadmins can manage all orders
CREATE POLICY "superadmins_manage_all_orders"
ON orders
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create audit log function for PII access tracking
CREATE OR REPLACE FUNCTION log_customer_pii_access()
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

-- Add trigger to log PII access (optional, can be enabled for compliance)
-- Commented out by default to avoid performance impact
-- CREATE TRIGGER log_order_pii_access
-- AFTER SELECT ON orders
-- FOR EACH ROW
-- EXECUTE FUNCTION log_customer_pii_access();