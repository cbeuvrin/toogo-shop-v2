-- Actualizar logo URL en tenant_settings
UPDATE tenant_settings 
SET logo_url = '/lovable-uploads/efb768f3-8eaa-4ea5-8eb0-9c1bd7525372.png' 
WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

-- Actualizar o insertar logo en visual_editor_data
INSERT INTO visual_editor_data (
  tenant_id,
  element_type, 
  element_id,
  data
) VALUES (
  '2d62ded6-0745-4ced-abdb-30b7b82e5686',
  'logo',
  'main_logo',
  jsonb_build_object(
    'url', '/lovable-uploads/efb768f3-8eaa-4ea5-8eb0-9c1bd7525372.png',
    'alt', 'Logo de la tienda'
  )
)
ON CONFLICT (tenant_id, element_type, element_id)
DO UPDATE SET
  data = jsonb_build_object(
    'url', '/lovable-uploads/efb768f3-8eaa-4ea5-8eb0-9c1bd7525372.png', 
    'alt', 'Logo de la tienda'
  ),
  updated_at = now();