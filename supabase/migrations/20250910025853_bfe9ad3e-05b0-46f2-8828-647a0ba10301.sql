-- Fase 2: Corrección de la función de migración y sincronización bidireccional

-- 1. Corregir función para buscar element_type = 'product' (singular)
CREATE OR REPLACE FUNCTION sync_visual_editor_products_to_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  visual_product RECORD;
  product_data JSONB;
  individual_product JSONB;
  new_product_id UUID;
  tenant_record RECORD;
BEGIN
  -- Get the first tenant (or create logic to determine correct tenant)
  SELECT * INTO tenant_record FROM tenants LIMIT 1;
  
  IF tenant_record IS NULL THEN
    RAISE EXCEPTION 'No tenant found';
  END IF;

  -- Sync products from visual_editor_data to products table
  -- IMPORTANTE: Buscar 'product' (singular) no 'products' (plural)
  FOR visual_product IN 
    SELECT * FROM visual_editor_data 
    WHERE element_type = 'product'
  LOOP
    product_data := visual_product.data;
    
    -- Check if this is a single product object
    IF product_data ? 'name' THEN
      -- Check if product already exists
      SELECT id INTO new_product_id 
      FROM products 
      WHERE title = (product_data->>'name')
        AND tenant_id = tenant_record.id;
        
      IF new_product_id IS NULL THEN
        -- Insert new product
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
          tenant_record.id,
          COALESCE(product_data->>'name', 'Producto Sin Nombre'),
          COALESCE(product_data->>'description', ''),
          COALESCE((product_data->>'price')::numeric, 0),
          COALESCE((product_data->>'price')::numeric * 20, 0), -- Default exchange rate
          COALESCE((product_data->>'stock')::integer, 0),
          'active',
          'simple'
        ) RETURNING id INTO new_product_id;
        
        -- Insert product image if exists
        IF product_data ? 'image' AND product_data->>'image' != '' THEN
          INSERT INTO product_images (product_id, url, sort)
          VALUES (new_product_id, product_data->>'image', 0);
        END IF;
        
        RAISE NOTICE 'Created product: % with ID: %', product_data->>'name', new_product_id;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- 2. Ejecutar la migración corregida
SELECT sync_visual_editor_products_to_products();

-- 3. Crear función para sincronización bidireccional: products -> visual_editor_data
CREATE OR REPLACE FUNCTION sync_product_to_visual_editor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  product_image_url TEXT;
  visual_data JSONB;
BEGIN
  -- Get the first image URL for this product
  SELECT url INTO product_image_url 
  FROM product_images 
  WHERE product_id = NEW.id 
  ORDER BY sort ASC 
  LIMIT 1;

  -- Create the JSON structure expected by visual editor
  visual_data := jsonb_build_object(
    'name', NEW.title,
    'description', COALESCE(NEW.description, ''),
    'price', NEW.price_usd,
    'stock', NEW.stock,
    'image', COALESCE(product_image_url, '')
  );

  -- Update or insert into visual_editor_data
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

  RETURN NEW;
END;
$function$;

-- 4. Crear trigger para sincronización automática
CREATE TRIGGER sync_product_to_visual_editor_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_to_visual_editor();

-- 5. Crear función para sincronización: visual_editor_data -> products
CREATE OR REPLACE FUNCTION sync_visual_editor_to_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  product_id_uuid UUID;
  existing_product_id UUID;
BEGIN
  -- Only process if this is a product element
  IF NEW.element_type != 'product' THEN
    RETURN NEW;
  END IF;

  -- Try to parse element_id as UUID (if it's a product ID)
  BEGIN
    product_id_uuid := NEW.element_id::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- If element_id is not a UUID, try to find product by name
      SELECT id INTO existing_product_id
      FROM products
      WHERE title = (NEW.data->>'name')
        AND tenant_id = NEW.tenant_id;
        
      IF existing_product_id IS NOT NULL THEN
        product_id_uuid := existing_product_id;
      ELSE
        -- Create new product if not found
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
        
        -- Update the element_id with the new product ID
        NEW.element_id := product_id_uuid::text;
      END IF;
  END;

  -- Update existing product if we have a valid UUID
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
      
    -- Update product image if provided
    IF NEW.data ? 'image' AND NEW.data->>'image' != '' THEN
      INSERT INTO product_images (product_id, url, sort)
      VALUES (product_id_uuid, NEW.data->>'image', 0)
      ON CONFLICT (product_id, url)
      DO UPDATE SET url = NEW.data->>'image';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. Crear trigger para sincronización desde visual editor
CREATE TRIGGER sync_visual_editor_to_product_trigger
  BEFORE INSERT OR UPDATE ON visual_editor_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_visual_editor_to_product();