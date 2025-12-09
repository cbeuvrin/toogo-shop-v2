-- MIGRACIÓN UNIVERSAL MULTI-TENANT: Limpiar y reconstruir sistema completo

-- 1. LIMPIAR TRIGGERS EXISTENTES
DROP TRIGGER IF EXISTS sync_visual_editor_to_product_safe_trigger ON visual_editor_data;
DROP TRIGGER IF EXISTS sync_product_to_visual_editor_safe_trigger ON products;
DROP FUNCTION IF EXISTS sync_visual_editor_to_product_safe();
DROP FUNCTION IF EXISTS sync_product_to_visual_editor_safe();

-- 2. MIGRAR PRODUCTOS de visual_editor_data a products para TODOS los tenants
INSERT INTO products (
  tenant_id,
  title,
  description,
  price_usd,
  price_mxn,
  stock,
  status,
  product_type,
  features,
  sku
)
SELECT DISTINCT
  ved.tenant_id,
  COALESCE(ved.data->>'name', 'Producto Sin Nombre') as title,
  COALESCE(ved.data->>'description', '') as description,
  COALESCE((ved.data->>'price')::numeric, 0) as price_usd,
  COALESCE((ved.data->>'price')::numeric * 20, 0) as price_mxn,
  COALESCE((ved.data->>'stock')::integer, 0) as stock,
  'active' as status,
  'simple' as product_type,
  CASE 
    WHEN ved.data ? 'features' AND jsonb_typeof(ved.data->'features') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(ved.data->'features'))
    ELSE '{}'::text[]
  END as features,
  COALESCE(ved.data->>'sku', '') as sku
FROM visual_editor_data ved
WHERE ved.element_type = 'product'
  AND ved.data ? 'name'
  AND NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.title = (ved.data->>'name') 
      AND p.tenant_id = ved.tenant_id
  );

-- 3. MIGRAR IMÁGENES de productos para TODOS los tenants
INSERT INTO product_images (product_id, url, sort)
SELECT DISTINCT
  p.id as product_id,
  COALESCE(ved.data->>'imageUrl', ved.data->>'image') as url,
  0 as sort
FROM visual_editor_data ved
JOIN products p ON p.title = (ved.data->>'name') AND p.tenant_id = ved.tenant_id
WHERE ved.element_type = 'product'
  AND (ved.data ? 'imageUrl' OR ved.data ? 'image')
  AND COALESCE(ved.data->>'imageUrl', ved.data->>'image') != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi 
    WHERE pi.product_id = p.id 
      AND pi.url = COALESCE(ved.data->>'imageUrl', ved.data->>'image')
  );

-- 4. CREAR CATEGORÍAS para TODOS los tenants
INSERT INTO categories (tenant_id, name, slug, show_on_home, sort)
SELECT DISTINCT
  ved.tenant_id,
  COALESCE(ved.data->>'category', 'General') as name,
  lower(replace(COALESCE(ved.data->>'category', 'general'), ' ', '-')) as slug,
  true as show_on_home,
  0 as sort
FROM visual_editor_data ved
WHERE ved.element_type = 'product'
  AND ved.data ? 'category'
  AND ved.data->>'category' != ''
  AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.name = (ved.data->>'category') 
      AND c.tenant_id = ved.tenant_id
  );

-- 5. VINCULAR PRODUCTOS con CATEGORÍAS para TODOS los tenants
INSERT INTO product_categories (product_id, category_id)
SELECT DISTINCT
  p.id as product_id,
  c.id as category_id
FROM visual_editor_data ved
JOIN products p ON p.title = (ved.data->>'name') AND p.tenant_id = ved.tenant_id
JOIN categories c ON c.name = (ved.data->>'category') AND c.tenant_id = ved.tenant_id
WHERE ved.element_type = 'product'
  AND ved.data ? 'category'
  AND ved.data->>'category' != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_categories pc 
    WHERE pc.product_id = p.id AND pc.category_id = c.id
  );

-- 6. REPORTE FINAL: Verificar estado para TODOS los tenants
DO $$
DECLARE
  tenant_record RECORD;
  products_count INTEGER;
  images_count INTEGER;
  categories_count INTEGER;
  total_tenants INTEGER := 0;
BEGIN
  RAISE NOTICE '=== MIGRACIÓN UNIVERSAL MULTI-TENANT COMPLETADA ===';
  
  FOR tenant_record IN 
    SELECT DISTINCT ved.tenant_id, 
           (SELECT name FROM tenants WHERE id = ved.tenant_id) as tenant_name
    FROM visual_editor_data ved 
    WHERE element_type = 'product'
  LOOP
    total_tenants := total_tenants + 1;
    
    SELECT COUNT(*) INTO products_count 
    FROM products 
    WHERE tenant_id = tenant_record.tenant_id;
    
    SELECT COUNT(*) INTO images_count 
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.tenant_id = tenant_record.tenant_id;
    
    SELECT COUNT(*) INTO categories_count 
    FROM categories 
    WHERE tenant_id = tenant_record.tenant_id;
    
    RAISE NOTICE '✅ Tenant: % (%)', 
      COALESCE(tenant_record.tenant_name, 'Sin nombre'), 
      tenant_record.tenant_id;
    RAISE NOTICE '   - Productos: % | Imágenes: % | Categorías: %', 
      products_count, images_count, categories_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 RESULTADO: % tenants procesados exitosamente', total_tenants;
  RAISE NOTICE '🔄 Sistema listo para nuevos usuarios y sincronización automática';
END $$;