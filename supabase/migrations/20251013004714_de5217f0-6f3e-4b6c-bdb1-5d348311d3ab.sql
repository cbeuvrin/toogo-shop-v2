-- Unificar formato de banners: convertir 'banners' (plural) a 'banner' (singular)
-- Solo para tenants activos que no tengan ya banners en formato singular

DO $$
DECLARE
  tenant_record RECORD;
  banner_items JSONB;
  banner_item JSONB;
  banner_idx INTEGER;
BEGIN
  -- Iterar sobre tenants activos con banners en formato plural
  FOR tenant_record IN 
    SELECT DISTINCT tenant_id
    FROM visual_editor_data
    WHERE element_type = 'banners'
      AND EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = visual_editor_data.tenant_id 
        AND status = 'active'
      )
      -- Solo si NO tienen ya banners en formato singular
      AND NOT EXISTS (
        SELECT 1 FROM visual_editor_data ved2
        WHERE ved2.tenant_id = visual_editor_data.tenant_id
        AND ved2.element_type = 'banner'
      )
  LOOP
    -- Obtener el array de items del banner plural
    SELECT data->'items' INTO banner_items
    FROM visual_editor_data
    WHERE tenant_id = tenant_record.tenant_id
      AND element_type = 'banners'
    LIMIT 1;

    -- Crear un banner singular por cada item (máximo 4)
    IF banner_items IS NOT NULL AND jsonb_array_length(banner_items) > 0 THEN
      FOR banner_idx IN 0..LEAST(jsonb_array_length(banner_items) - 1, 3)
      LOOP
        banner_item := banner_items->banner_idx;
        
        INSERT INTO visual_editor_data (
          tenant_id,
          element_type,
          element_id,
          data
        ) VALUES (
          tenant_record.tenant_id,
          'banner',  -- Singular
          'banner_' || (banner_idx + 1),
          jsonb_build_object(
            'imageUrl', banner_item->>'imageUrl',
            'sort', banner_idx
          )
        );
      END LOOP;
    END IF;

    -- Eliminar el registro plural después de crear los singulares
    DELETE FROM visual_editor_data
    WHERE tenant_id = tenant_record.tenant_id
      AND element_type = 'banners';

  END LOOP;
END $$;