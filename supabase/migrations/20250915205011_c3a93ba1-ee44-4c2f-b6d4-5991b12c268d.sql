-- Fix superadmin roles to have NULL tenant_id for proper multi-tenant access
UPDATE user_roles 
SET tenant_id = NULL 
WHERE role = 'superadmin';