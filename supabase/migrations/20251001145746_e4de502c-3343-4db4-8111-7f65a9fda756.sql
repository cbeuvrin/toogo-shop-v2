-- Fix: Restrict public access to tenants table to prevent competitor intelligence gathering
-- Remove the overly permissive public policy that allows anyone to see business owner info

DROP POLICY IF EXISTS "Public can view active tenants for store resolution" ON tenants;

-- The policy "users_can_view_their_own_tenants" already exists and provides proper access control
-- Store resolution continues to work through SECURITY DEFINER functions:
-- - get_tenant_by_host(p_host text)
-- - get_public_store_data(p_host text)
-- These functions have elevated privileges and don't need public SELECT on tenants