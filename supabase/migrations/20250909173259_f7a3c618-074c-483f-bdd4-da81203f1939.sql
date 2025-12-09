-- Correct the tenant_id to match the one that has the visual_editor_data
UPDATE user_roles 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE user_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' AND role = 'superadmin';