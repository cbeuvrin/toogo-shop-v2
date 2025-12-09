-- Fix missing user roles for tenants without assigned admins
-- First, let's assign tenant_admin roles to tenant owners who don't have roles yet

INSERT INTO user_roles (user_id, tenant_id, role)
SELECT 
  t.owner_user_id,
  t.id,
  'tenant_admin'::app_role
FROM tenants t
LEFT JOIN user_roles ur ON ur.tenant_id = t.id AND ur.user_id = t.owner_user_id
WHERE t.owner_user_id IS NOT NULL 
  AND ur.id IS NULL;

-- Also ensure we have a superadmin user (assuming the first user should be superadmin)
-- This will help with testing and initial access
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user (oldest account)
  SELECT id INTO first_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Make them superadmin if they don't already have a role
  IF first_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, tenant_id, role)
    SELECT first_user_id, NULL, 'superadmin'::app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = first_user_id AND role = 'superadmin'::app_role
    );
  END IF;
END $$;