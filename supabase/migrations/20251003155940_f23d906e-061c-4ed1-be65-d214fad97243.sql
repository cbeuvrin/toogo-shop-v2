-- Security hardening for orders table: enforce strict tenant isolation and force RLS

-- 1) Ensure RLS is enabled and forced
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

-- 2) Create/refresh restrictive tenant isolation policy (idempotent via DROP/CREATE)
DROP POLICY IF EXISTS "authenticated_users_tenant_isolation" ON public.orders;

CREATE POLICY "authenticated_users_tenant_isolation"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  -- Allow if user is a superadmin (can access all orders)
  public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR
  -- Allow if user owns this order (customer access)
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Allow if user has a role in this order's tenant
  (
    public.has_role(auth.uid(), 'tenant_admin'::public.app_role, tenant_id)
    OR
    public.has_role(auth.uid(), 'tenant_staff'::public.app_role, tenant_id)
  )
);

COMMENT ON POLICY "authenticated_users_tenant_isolation" ON public.orders IS
'RESTRICTIVE tenant isolation policy for authenticated users. Enforces that users must be superadmin, the order owner, or have a tenant role for orders. Combined with FORCE RLS, this prevents cross-tenant data access.';
