-- Fix: Restrict public access to tenants table to prevent competitor intelligence gathering
-- Store resolution is handled by security definer functions, not public queries

-- Step 1: Remove the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active tenants for store resolution" ON tenants;

-- Step 2: Ensure the existing security definer functions work correctly
-- get_tenant_by_host() and get_public_store_data() already use SECURITY DEFINER
-- so they will continue to work without public SELECT access

-- Step 3: Add a more restrictive policy for tenant visibility
-- This allows authenticated users to see ONLY the tenants they belong to
CREATE POLICY "users_can_view_their_own_tenants"
ON tenants
FOR SELECT
TO authenticated
USING (
  -- User is the owner
  (auth.uid() = owner_user_id)
  OR
  -- User has a role in this tenant
  (id IN (
    SELECT tenant_id 
    FROM user_roles 
    WHERE user_id = auth.uid()
  ))
  OR
  -- User is a superadmin
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Note: The existing policies remain:
-- - "Superadmins can manage all tenants" (for admin operations)
-- - "Users can create tenants" (for new tenant creation)
-- - "Users can view own tenant" (kept for backward compatibility)

-- Store resolution continues to work through:
-- - get_tenant_by_host(p_host text) - SECURITY DEFINER function
-- - get_public_store_data(p_host text) - SECURITY DEFINER function
-- These functions have elevated privileges and don't need public SELECT