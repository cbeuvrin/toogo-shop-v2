-- Safe migration to fix missing user roles
-- Use ON CONFLICT to handle duplicates gracefully

-- Assign tenant_admin roles to tenant owners who don't have this specific role yet
INSERT INTO user_roles (user_id, tenant_id, role)
SELECT 
  t.owner_user_id,
  t.id,
  'tenant_admin'::app_role
FROM tenants t
WHERE t.owner_user_id IS NOT NULL 
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure we have at least one superadmin (first user)
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, tenant_id, role)
    VALUES (first_user_id, NULL, 'superadmin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;