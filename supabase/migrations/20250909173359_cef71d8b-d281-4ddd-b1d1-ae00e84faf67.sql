-- Update the user_roles to use the existing tenant_id that has data
UPDATE user_roles 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE user_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' AND role = 'superadmin';