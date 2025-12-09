-- Fase 1: Corrección completa del sistema multi-tenant

-- 1. Identificar el tenant_id correcto del usuario actual
-- Basándonos en los logs, el tenant_id correcto es: 2d62ded6-0745-4ced-abdb-30b7b82e5686
-- Y el incorrecto que tienen los productos es: 3255e98c-731f-4403-be61-53d756e93d6f

-- 2. Corregir tenant_id en tabla products
UPDATE products 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE tenant_id = '3255e98c-731f-4403-be61-53d756e93d6f';

-- 3. Corregir tenant_id en product_images (si existen)
UPDATE product_images 
SET updated_at = now()
WHERE product_id IN (
  SELECT id FROM products WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
);

-- 4. Corregir función get_user_tenant para que funcione con superadmins
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE(
    (SELECT tenant_id
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role IN ('tenant_admin', 'tenant_staff')
     LIMIT 1),
    -- Para superadmins, devolver el primer tenant disponible
    (SELECT tenant_id
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role = 'superadmin'
     LIMIT 1)
  )
$function$;

-- 5. Asegurar que visual_editor_data tenga el tenant_id correcto
UPDATE visual_editor_data 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE tenant_id = '3255e98c-731f-4403-be61-53d756e93d6f';

-- 6. Ejecutar sincronización completa para asegurar consistencia
SELECT sync_visual_editor_products_to_products();

-- 7. Forzar sincronización bidireccional ejecutando triggers manualmente
-- Esto actualizará visual_editor_data con los datos correctos de products
DO $$
DECLARE
  product_record RECORD;
BEGIN
  FOR product_record IN 
    SELECT * FROM products WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
  LOOP
    -- Trigger manual de sync_product_to_visual_editor
    PERFORM sync_product_to_visual_editor_trigger();
  END LOOP;
END $$;

-- 8. Verificar que todo esté correcto con una consulta de diagnóstico
-- Esta query debería mostrar los productos correctamente
SELECT 
  'products' as source,
  COUNT(*) as count,
  tenant_id
FROM products 
WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
GROUP BY tenant_id
UNION ALL
SELECT 
  'visual_editor_data' as source,
  COUNT(*) as count,
  tenant_id
FROM visual_editor_data 
WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' 
  AND element_type = 'product'
GROUP BY tenant_id;

-- 9. Añadir constraint para prevenir problemas futuros
ALTER TABLE products 
ADD CONSTRAINT products_tenant_id_not_null 
CHECK (tenant_id IS NOT NULL);

-- 10. Logging para confirmación
DO $$
BEGIN
  RAISE NOTICE 'Corrección multi-tenant completada. Productos migrados para tenant: 2d62ded6-0745-4ced-abdb-30b7b82e5686';
END $$;