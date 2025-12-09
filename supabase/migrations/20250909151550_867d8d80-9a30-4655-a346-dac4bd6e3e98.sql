-- Add unique constraint to user_roles table and assign superadmin role
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Assign superadmin role to the creator (first registered user)
INSERT INTO user_roles (user_id, role) 
VALUES ('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'superadmin');