-- Add restrictive tenant isolation policy for orders table
-- This prevents authenticated users from accessing orders outside their tenant scope

-- SECURITY FIX: Add restrictive policy to enforce tenant isolation
-- This policy is AND'd with all other policies (not OR'd like permissive policies)
-- It ensures authenticated users can ONLY access orders if at least ONE of these is true:
--   1. The order belongs to a tenant where they have a role (tenant_admin, tenant_staff)
--   2. The order is their own (user_id = auth.uid())
--   3. They are a superadmin (can access all tenants)

DROP POLICY IF EXISTS "authenticated_users_tenant_isolation" ON public.orders;

CREATE POLICY "authenticated_users_tenant_isolation"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  -- Allow if user is a superadmin (can access all orders)
  has_role(auth.uid(), 'superadmin'::app_role)
  OR
  -- Allow if user owns this order (customer access)
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Allow if user has a role in this order's tenant
  (
    -- Check if user has tenant_admin role for this order's tenant
    has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
    OR
    -- Check if user has tenant_staff role for this order's tenant
    has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
  )
);

-- Add comprehensive security comment
COMMENT ON POLICY "authenticated_users_tenant_isolation" ON public.orders IS
'RESTRICTIVE tenant isolation policy for authenticated users.

This policy is RESTRICTIVE (not PERMISSIVE), meaning it is AND''d with all other policies.
Even if another policy allows access, this policy must also pass.

PURPOSE: Prevent cross-tenant data access by authenticated users.

ALLOWED ACCESS:
1. Superadmins: Full access to all orders across all tenants
2. Customers: Can only access their own orders (user_id = auth.uid())
3. Tenant Admins: Can only access orders within their tenant
4. Tenant Staff: Can only access orders within their tenant

SECURITY GUARANTEE:
An authenticated user from Tenant A can NEVER access orders from Tenant B,
even if they somehow bypass application-level filtering or manipulate queries.

This implements defense-in-depth by enforcing tenant isolation at the database level.';

-- Update table comment to reflect enhanced security
COMMENT ON TABLE public.orders IS 
'ORDERS TABLE - Contains sensitive customer PII (names, emails, phones, addresses)
═══════════════════════════════════════════════════════════════════════════
SECURITY MODEL (Enhanced with Restrictive Tenant Isolation):
- Anonymous users: Completely blocked by restrictive policy
- Authenticated customers: Can ONLY view their own orders (user_id = auth.uid())
- Tenant staff: Can ONLY view orders for their tenant (enforced by restrictive policy)
- Superadmins: Can view all orders across all tenants
- All PII modifications logged to admin_activity_logs for compliance audit trail
═══════════════════════════════════════════════════════════════════════════
RLS POLICIES ACTIVE:
1. anonymous_users_cannot_access_orders (RESTRICTIVE) - blocks all anon access
2. authenticated_users_tenant_isolation (RESTRICTIVE) - enforces tenant boundaries
3. customers_view_own_orders_only (PERMISSIVE) - allows customer to see own orders
4. tenant_admins_view_tenant_orders (PERMISSIVE) - tenant-scoped access
5. tenant_staff_view_tenant_orders (PERMISSIVE) - tenant-scoped access
6. superadmins_view_all_orders (PERMISSIVE) - system-wide access
═══════════════════════════════════════════════════════════════════════════
DEFENSE IN DEPTH:
The combination of RESTRICTIVE and PERMISSIVE policies ensures:
- RESTRICTIVE policies: Define the absolute boundaries (anon blocked, tenant isolated)
- PERMISSIVE policies: Define the specific access rules within those boundaries
- Result: Layered security that prevents unauthorized access even if app-level checks fail
═══════════════════════════════════════════════════════════════════════════';