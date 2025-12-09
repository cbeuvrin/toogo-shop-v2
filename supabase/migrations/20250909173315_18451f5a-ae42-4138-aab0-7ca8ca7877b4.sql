-- Create the missing tenant that corresponds to the visual_editor_data
INSERT INTO tenants (id, name, plan, status, owner_user_id, primary_host)
VALUES (
  '2d62ded6-0745-4ced-abdb-30b7b82e5686', 
  'Demo Store', 
  'free', 
  'active', 
  '2d62ded6-0745-4ced-abdb-30b7b82e5686',
  'demo.localhost'
);

-- Now update the user_roles to use the correct tenant_id
UPDATE user_roles 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE user_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' AND role = 'superadmin';