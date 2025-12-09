-- Actualizar tenant_settings con el logo del usuario
UPDATE tenant_settings 
SET logo_url = '/lovable-uploads/0c44dccb-1d8b-442f-a69b-b4a8ff3ba1c2.png'
WHERE tenant_id = (
  SELECT tenant_id 
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
);