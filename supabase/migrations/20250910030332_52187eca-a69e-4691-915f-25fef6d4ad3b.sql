-- SOLUCIÓN URGENTE: Remover triggers que causan recursión infinita

-- 1. Eliminar triggers que están causando el loop infinito
DROP TRIGGER IF EXISTS sync_product_to_visual_editor_trigger ON products;
DROP TRIGGER IF EXISTS sync_visual_editor_to_product_trigger ON visual_editor_data;

-- 2. Corregir tenant_id en products (sin triggers)
UPDATE products 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE tenant_id = '3255e98c-731f-4403-be61-53d756e93d6f';

-- 3. Corregir tenant_id en visual_editor_data
UPDATE visual_editor_data 
SET tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'
WHERE tenant_id = '3255e98c-731f-4403-be61-53d756e93d6f';

-- 4. Corregir función get_user_tenant para superadmins
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

-- 5. Verificar que los datos ahora estén correctos
DO $$
DECLARE
  products_count INTEGER;
  visual_editor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO products_count 
  FROM products 
  WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';
  
  SELECT COUNT(*) INTO visual_editor_count 
  FROM visual_editor_data 
  WHERE tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686' 
    AND element_type = 'product';
  
  RAISE NOTICE 'Productos en tabla products: %', products_count;
  RAISE NOTICE 'Productos en visual_editor_data: %', visual_editor_count;
  
  IF products_count > 0 THEN
    RAISE NOTICE 'ÉXITO: Los productos ahora tienen el tenant_id correcto y deberían ser visibles en el dashboard.';
  END IF;
END $$;