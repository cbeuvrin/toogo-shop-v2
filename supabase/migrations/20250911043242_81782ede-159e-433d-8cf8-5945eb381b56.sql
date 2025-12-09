-- Limpiar datos duplicados de logo en visual_editor_data
DELETE FROM visual_editor_data 
WHERE element_type = 'logo' 
AND element_id = 'main';

-- Asegurar que existe la entrada correcta sincronizada
INSERT INTO visual_editor_data (
  tenant_id,
  element_type,
  element_id,
  data
) 
SELECT 
  ts.tenant_id,
  'logo',
  'main_logo',
  jsonb_build_object(
    'url', COALESCE(ts.logo_url, ''),
    'alt', 'Logo de la tienda'
  )
FROM tenant_settings ts
WHERE ts.logo_url IS NOT NULL
ON CONFLICT (tenant_id, element_type, element_id)
DO UPDATE SET
  data = jsonb_build_object(
    'url', COALESCE(EXCLUDED.data->>'url', ''),
    'alt', 'Logo de la tienda'
  ),
  updated_at = now();