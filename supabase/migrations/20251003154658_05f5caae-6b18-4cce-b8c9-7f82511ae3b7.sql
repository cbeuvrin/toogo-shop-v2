-- Document security model and add audit logging for customer PII modifications
-- Note: SELECT triggers don't exist in PostgreSQL, so we log modifications instead

-- Add helpful comment explaining the comprehensive security model for orders table
COMMENT ON TABLE public.orders IS 
'ORDERS TABLE - Contains sensitive customer PII (names, emails, phones, addresses)
═══════════════════════════════════════════════════════════════════════════
SECURITY MODEL:
- Anonymous users: Completely blocked by restrictive RLS policy
- Authenticated customers: Can ONLY view their own orders (user_id = auth.uid())
- Tenant staff: Can view all orders for their tenant only
- Superadmins: Can view all orders across all tenants
- All PII modifications logged to admin_activity_logs for compliance audit trail
═══════════════════════════════════════════════════════════════════════════
RLS POLICIES ACTIVE:
1. anonymous_users_cannot_access_orders (RESTRICTIVE) - blocks all anon access
2. customers_view_own_orders_only - restricts to user_id = auth.uid()
3. tenant_admins_view_tenant_orders - tenant-scoped access
4. tenant_staff_view_tenant_orders - tenant-scoped access
5. superadmins_view_all_orders - system-wide access
═══════════════════════════════════════════════════════════════════════════';

-- Add PII markers on sensitive columns for compliance
COMMENT ON COLUMN public.orders.customer_name IS '⚠️ PII: Customer full name - modifications logged';
COMMENT ON COLUMN public.orders.customer_email IS '⚠️ PII: Customer email address - modifications logged';
COMMENT ON COLUMN public.orders.customer_phone IS '⚠️ PII: Customer phone number - modifications logged';
COMMENT ON COLUMN public.orders.customer_address IS '⚠️ PII: Customer physical address - modifications logged';
COMMENT ON COLUMN public.orders.customer_state IS '⚠️ PII: Customer state/region - modifications logged';

-- Create trigger to log when customer PII is modified (UPDATE operations)
-- This provides an audit trail for compliance (GDPR, CCPA, etc.)
DROP TRIGGER IF EXISTS log_order_pii_modification_trigger ON public.orders;

CREATE TRIGGER log_order_pii_modification_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (
    -- Only log when PII fields are actually changed
    OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
    OLD.customer_email IS DISTINCT FROM NEW.customer_email OR
    OLD.customer_phone IS DISTINCT FROM NEW.customer_phone OR
    OLD.customer_address IS DISTINCT FROM NEW.customer_address OR
    OLD.customer_state IS DISTINCT FROM NEW.customer_state
  )
  EXECUTE FUNCTION public.log_customer_pii_access();