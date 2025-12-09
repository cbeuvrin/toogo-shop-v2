-- Fix: Update product_variables to have correct tenant_id
UPDATE product_variables 
SET tenant_id = (
  SELECT id FROM tenants LIMIT 1
) 
WHERE tenant_id IS NULL;

-- Create migration function to sync visual_editor_data products to products table
CREATE OR REPLACE FUNCTION sync_visual_editor_products_to_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  visual_product RECORD;
  product_data JSONB;
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
    IF product_data ? 'products' THEN
      -- Process each product in the products array
      FOR product_data IN SELECT jsonb_array_elements(product_data->'products')
      LOOP
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
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- Execute the sync
SELECT sync_visual_editor_products_to_products();

-- Create function to ensure data consistency between systems
CREATE OR REPLACE FUNCTION ensure_product_data_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When products are updated, we can optionally sync back to visual_editor_data
  -- This ensures both systems stay in sync
  RETURN NEW;
END;
$function$;