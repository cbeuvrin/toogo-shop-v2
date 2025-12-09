-- Agregar banner por defecto a tenants existentes que no tienen banners
INSERT INTO visual_editor_data (tenant_id, element_type, element_id, data)
SELECT 
  t.id AS tenant_id,
  'banners' AS element_type,
  'banner_1' AS element_id,
  jsonb_build_object(
    'items', jsonb_build_array(
      jsonb_build_object(
        'id', 'default-banner-1',
        'imageUrl', '/assets/default-banner.jpg',
        'sort', 0,
        'title', 'Bienvenido a tu tienda',
        'description', 'Personaliza este banner desde el editor visual',
        'linkUrl', ''
      )
    )
  ) AS data
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM visual_editor_data ved
  WHERE ved.tenant_id = t.id
    AND ved.element_type = 'banners'
)
AND t.status = 'active'
ON CONFLICT (tenant_id, element_type, element_id) 
DO NOTHING;