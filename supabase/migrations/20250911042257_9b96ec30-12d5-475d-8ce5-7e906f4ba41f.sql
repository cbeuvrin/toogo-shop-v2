-- Actualizar tenant_settings con el logo correcto del usuario
UPDATE tenant_settings 
SET logo_url = '/lovable-uploads/1080c34f-6781-4a7d-aacd-5dff7f26d757.png'
WHERE tenant_id = (
  SELECT tenant_id 
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
);