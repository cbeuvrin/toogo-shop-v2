-- Paso 1: Limpiar duplicados (eliminar 'main' donde existe 'store_contact' más reciente)
DELETE FROM visual_editor_data ved1
WHERE ved1.element_type = 'contact' 
AND ved1.element_id = 'main'
AND EXISTS (
  SELECT 1 FROM visual_editor_data ved2
  WHERE ved2.tenant_id = ved1.tenant_id
  AND ved2.element_type = 'contact'
  AND ved2.element_id = 'store_contact'
  AND ved2.updated_at >= ved1.updated_at
);

-- Paso 2: Migrar 'main' a 'store_contact' (solo donde no hay duplicado)
UPDATE visual_editor_data 
SET element_id = 'store_contact'
WHERE element_type = 'contact' 
AND element_id = 'main'
AND NOT EXISTS (
  SELECT 1 FROM visual_editor_data ved2
  WHERE ved2.tenant_id = visual_editor_data.tenant_id
  AND ved2.element_type = 'contact'
  AND ved2.element_id = 'store_contact'
);

-- Paso 3: Migrar 'contact_info' a 'store_contact'
UPDATE visual_editor_data 
SET element_id = 'store_contact'
WHERE element_type = 'contact' 
AND element_id = 'contact_info';