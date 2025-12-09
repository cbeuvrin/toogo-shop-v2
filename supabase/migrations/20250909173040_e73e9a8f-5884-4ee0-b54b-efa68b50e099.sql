-- Update the superadmin user to have access to the tenant with data
UPDATE user_roles 
SET tenant_id = '3255e98c-731f-4403-be61-53d756e93d6f'
WHERE user_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' AND role = 'superadmin';