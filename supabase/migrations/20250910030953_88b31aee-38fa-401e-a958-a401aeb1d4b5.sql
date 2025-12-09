-- MIGRACIÓN UNIVERSAL MULTI-TENANT: Sincronizar todos los datos para todos los tenants

-- 1. MIGRAR PRODUCTOS de visual_editor_data a products para TODOS los tenants
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

-- 2. MIGRAR IMÁGENES de productos para TODOS los tenants
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

-- 3. CREAR CATEGORÍAS para TODOS los tenants
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

-- 4. VINCULAR PRODUCTOS con CATEGORÍAS para TODOS los tenants
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

-- 5. CREAR TRIGGER INTELIGENTE para sincronización automática SIN loops infinitos
CREATE OR REPLACE FUNCTION public.sync_visual_editor_to_product_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_id_uuid UUID;
  existing_product_id UUID;
  image_url TEXT;
BEGIN
  -- Solo procesar elementos de tipo 'product'
  IF NEW.element_type != 'product' THEN
    RETURN NEW;
  END IF;

  -- Evitar loops: usar una variable de control en la sesión
  IF current_setting('app.sync_in_progress', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Establecer flag para evitar recursión
  PERFORM set_config('app.sync_in_progress', 'true', true);

  BEGIN
    -- Intentar convertir element_id a UUID
    product_id_uuid := NEW.element_id::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- Si no es UUID válido, buscar por nombre
      SELECT id INTO existing_product_id
      FROM products
      WHERE title = (NEW.data->>'name')
        AND tenant_id = NEW.tenant_id;
        
      IF existing_product_id IS NOT NULL THEN
        product_id_uuid := existing_product_id;
        NEW.element_id := product_id_uuid::text;
      ELSE
        -- Crear nuevo producto
        INSERT INTO products (
          tenant_id,
          title,
          description,
          price_usd,
          price_mxn,
          stock,
          status,
          product_type
        ) VALUES (
          NEW.tenant_id,
          COALESCE(NEW.data->>'name', 'Producto Sin Nombre'),
          COALESCE(NEW.data->>'description', ''),
          COALESCE((NEW.data->>'price')::numeric, 0),
          COALESCE((NEW.data->>'price')::numeric * 20, 0),
          COALESCE((NEW.data->>'stock')::integer, 0),
          'active',
          'simple'
        ) RETURNING id INTO product_id_uuid;
        
        NEW.element_id := product_id_uuid::text;
      END IF;
  END;

  -- Actualizar producto existente
  IF product_id_uuid IS NOT NULL THEN
    UPDATE products SET
      title = COALESCE(NEW.data->>'name', title),
      description = COALESCE(NEW.data->>'description', description),
      price_usd = COALESCE((NEW.data->>'price')::numeric, price_usd),
      price_mxn = COALESCE((NEW.data->>'price')::numeric * 20, price_mxn),
      stock = COALESCE((NEW.data->>'stock')::integer, stock),
      updated_at = now()
    WHERE id = product_id_uuid
      AND tenant_id = NEW.tenant_id;
      
    -- Sincronizar imagen si está presente
    image_url := COALESCE(NEW.data->>'imageUrl', NEW.data->>'image');
    IF image_url IS NOT NULL AND image_url != '' THEN
      INSERT INTO product_images (product_id, url, sort)
      VALUES (product_id_uuid, image_url, 0)
      ON CONFLICT (product_id, url)
      DO UPDATE SET url = image_url;
    END IF;
  END IF;

  -- Remover flag de control
  PERFORM set_config('app.sync_in_progress', 'false', true);

  RETURN NEW;
END;
$function$;

-- 6. CREAR TRIGGER para sincronización en sentido contrario
CREATE OR REPLACE FUNCTION public.sync_product_to_visual_editor_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_image_url TEXT;
  visual_data JSONB;
BEGIN
  -- Evitar loops: usar variable de control
  IF current_setting('app.sync_in_progress', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Establecer flag
  PERFORM set_config('app.sync_in_progress', 'true', true);

  -- Obtener URL de imagen principal
  SELECT url INTO product_image_url 
  FROM product_images 
  WHERE product_id = NEW.id 
  ORDER BY sort ASC 
  LIMIT 1;

  -- Crear estructura JSON para visual editor
  visual_data := jsonb_build_object(
    'name', NEW.title,
    'description', COALESCE(NEW.description, ''),
    'price', NEW.price_usd,
    'stock', NEW.stock,
    'imageUrl', COALESCE(product_image_url, ''),
    'sku', COALESCE(NEW.sku, '')
  );

  -- Si hay features, agregarlas
  IF NEW.features IS NOT NULL AND array_length(NEW.features, 1) > 0 THEN
    visual_data := visual_data || jsonb_build_object('features', to_jsonb(NEW.features));
  END IF;

  -- Actualizar o insertar en visual_editor_data
  INSERT INTO visual_editor_data (
    tenant_id,
    element_type,
    element_id,
    data
  ) VALUES (
    NEW.tenant_id,
    'product',
    NEW.id::text,
    visual_data
  )
  ON CONFLICT (tenant_id, element_type, element_id)
  DO UPDATE SET
    data = visual_data,
    updated_at = now();

  -- Remover flag
  PERFORM set_config('app.sync_in_progress', 'false', true);

  RETURN NEW;
END;
$function$;

-- 7. CREAR TRIGGERS INTELIGENTES
CREATE TRIGGER sync_visual_editor_to_product_safe_trigger
  BEFORE INSERT OR UPDATE ON visual_editor_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_visual_editor_to_product_safe();

CREATE TRIGGER sync_product_to_visual_editor_safe_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_to_visual_editor_safe();

-- 8. REPORTE FINAL: Verificar estado para TODOS los tenants
DO $$
DECLARE
  tenant_record RECORD;
  products_count INTEGER;
  images_count INTEGER;
  categories_count INTEGER;
BEGIN
  RAISE NOTICE '=== REPORTE MIGRACIÓN UNIVERSAL MULTI-TENANT ===';
  
  FOR tenant_record IN 
    SELECT DISTINCT tenant_id, 
           (SELECT name FROM tenants WHERE id = ved.tenant_id) as tenant_name
    FROM visual_editor_data ved 
    WHERE element_type = 'product'
  LOOP
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
    
    RAISE NOTICE 'Tenant: % (%):', 
      COALESCE(tenant_record.tenant_name, 'Sin nombre'), 
      tenant_record.tenant_id;
    RAISE NOTICE '  - Productos: %', products_count;
    RAISE NOTICE '  - Imágenes: %', images_count;
    RAISE NOTICE '  - Categorías: %', categories_count;
  END LOOP;
  
  RAISE NOTICE '=== MIGRACIÓN COMPLETADA PARA TODOS LOS TENANTS ===';
  RAISE NOTICE 'Sincronización automática habilitada con protección anti-loops';
END $$;