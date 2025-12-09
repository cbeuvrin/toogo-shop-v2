-- Fase 1: Correcciones de Base de Datos

-- 1. Crear Foreign Key faltante entre product_variations y products
ALTER TABLE product_variations 
ADD CONSTRAINT product_variations_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- 2. Corregir función para migrar productos correctamente desde visual_editor_data
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
  FOR visual_product IN 
    SELECT * FROM visual_editor_data 
    WHERE element_type = 'products'
  LOOP
    product_data := visual_product.data;
    
    -- Extract products array from the data
    IF product_data ? 'products' AND jsonb_typeof(product_data->'products') = 'array' THEN
      -- Process each product in the products array
      FOR individual_product IN SELECT jsonb_array_elements(product_data->'products')
      LOOP
        -- Check if product already exists
        SELECT id INTO new_product_id 
        FROM products 
        WHERE title = (individual_product->>'name')
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
            COALESCE(individual_product->>'name', 'Producto Sin Nombre'),
            COALESCE(individual_product->>'description', ''),
            COALESCE((individual_product->>'price')::numeric, 0),
            COALESCE((individual_product->>'price')::numeric * 20, 0), -- Default exchange rate
            COALESCE((individual_product->>'stock')::integer, 0),
            'active',
            'simple'
          ) RETURNING id INTO new_product_id;
          
          -- Insert product image if exists
          IF individual_product ? 'image' AND individual_product->>'image' != '' THEN
            INSERT INTO product_images (product_id, url, sort)
            VALUES (new_product_id, individual_product->>'image', 0);
          END IF;
          
          RAISE NOTICE 'Created product: % with ID: %', individual_product->>'name', new_product_id;
        END IF;
      END LOOP;
    -- Handle case where products is a single object instead of array
    ELSIF product_data ? 'name' THEN
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

-- 3. Execute the sync
SELECT sync_visual_editor_products_to_products();

-- 4. Ensure product_variables have correct tenant_id
UPDATE product_variables 
SET tenant_id = (
  SELECT id FROM tenants LIMIT 1
) 
WHERE tenant_id IS NULL;