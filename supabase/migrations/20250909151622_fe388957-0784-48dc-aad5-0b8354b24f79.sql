-- Assign superadmin role to the creator (first registered user)
INSERT INTO user_roles (user_id, role) 
VALUES ('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'superadmin');