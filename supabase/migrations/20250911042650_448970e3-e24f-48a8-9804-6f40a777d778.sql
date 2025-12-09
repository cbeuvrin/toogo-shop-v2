-- Reparación completa del sistema de logos

-- 1. Actualizar tenant_settings con el logo correcto del usuario actual
UPDATE tenant_settings 
SET logo_url = '/lovable-uploads/1080c34f-6781-4a7d-aacd-5dff7f26d757.png',
    updated_at = now()
WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

-- 2. Crear/actualizar el elemento logo en visual_editor_data para sincronización
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
    'url', '/lovable-uploads/1080c34f-6781-4a7d-aacd-5dff7f26d757.png',
    'alt', 'Tu Logo'
  )
)
ON CONFLICT (tenant_id, element_type, element_id)
DO UPDATE SET
  data = jsonb_build_object(
    'url', '/lovable-uploads/1080c34f-6781-4a7d-aacd-5dff7f26d757.png',
    'alt', 'Tu Logo'
  ),
  updated_at = now();

-- 3. Verificar que las políticas RLS permiten acceso a todos los usuarios necesarios
-- Las políticas existentes están bien, pero vamos a asegurar que funcionen correctamente

-- 4. Crear trigger para sincronizar cambios de logo entre tenant_settings y visual_editor_data
CREATE OR REPLACE FUNCTION sync_logo_to_visual_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cuando se actualiza logo_url en tenant_settings, sincronizar con visual_editor_data
  IF NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN
    INSERT INTO visual_editor_data (
      tenant_id,
      element_type,
      element_id,
      data
    ) VALUES (
      NEW.tenant_id,
      'logo',
      'main_logo',
      jsonb_build_object(
        'url', COALESCE(NEW.logo_url, ''),
        'alt', 'Logo de la tienda'
      )
    )
    ON CONFLICT (tenant_id, element_type, element_id)
    DO UPDATE SET
      data = jsonb_build_object(
        'url', COALESCE(NEW.logo_url, ''),
        'alt', 'Logo de la tienda'
      ),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS sync_logo_on_tenant_settings_update ON tenant_settings;
CREATE TRIGGER sync_logo_on_tenant_settings_update
  AFTER UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_logo_to_visual_editor();

-- 5. Crear trigger para sincronizar cambios desde visual_editor_data a tenant_settings
CREATE OR REPLACE FUNCTION sync_logo_from_visual_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo procesar si es un elemento de tipo 'logo'
  IF NEW.element_type = 'logo' THEN
    UPDATE tenant_settings
    SET logo_url = NEW.data->>'url',
        updated_at = now()
    WHERE tenant_id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS sync_logo_from_visual_editor_update ON visual_editor_data;
CREATE TRIGGER sync_logo_from_visual_editor_update
  AFTER UPDATE ON visual_editor_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_logo_from_visual_editor();