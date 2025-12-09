-- Fix functions referencing removed column price_usd

-- 1) Replace sync_product_to_visual_editor to use MXN fields
CREATE OR REPLACE FUNCTION public.sync_product_to_visual_editor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    'price', COALESCE(NEW.sale_price_mxn, NEW.price_mxn, 0),
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

-- 2) Replace sync_visual_editor_products_to_products to stop using price_usd
CREATE OR REPLACE FUNCTION public.sync_visual_editor_products_to_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
        -- Insert new product (MXN only)
        INSERT INTO products (
          tenant_id,
          title,
          description,
          price_mxn,
          stock,
          status,
          product_type
        ) VALUES (
          tenant_record.id,
          COALESCE(product_data->>'name', 'Producto Sin Nombre'),
          COALESCE(product_data->>'description', ''),
          COALESCE((product_data->>'price')::numeric, 0),
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