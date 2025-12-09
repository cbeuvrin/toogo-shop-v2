-- Improve sync from visual editor to products without requiring ON CONFLICT
CREATE OR REPLACE FUNCTION public.sync_visual_editor_to_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  product_id_uuid UUID;
  existing_product_id UUID;
  existing_image_id UUID;
  image_url TEXT;
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
        AND tenant_id = NEW.tenant_id
      LIMIT 1;

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
      image_url := NEW.data->>'image';
      -- Try to find an existing primary image (sort = 0) for this product
      SELECT id INTO existing_image_id
      FROM product_images
      WHERE product_id = product_id_uuid AND sort = 0
      LIMIT 1;

      IF existing_image_id IS NOT NULL THEN
        UPDATE product_images
        SET url = image_url, sort = 0
        WHERE id = existing_image_id;
      ELSE
        -- If an image with the same URL exists, update it to be primary
        SELECT id INTO existing_image_id
        FROM product_images
        WHERE product_id = product_id_uuid AND url = image_url
        LIMIT 1;

        IF existing_image_id IS NOT NULL THEN
          UPDATE product_images
          SET sort = 0
          WHERE id = existing_image_id;
        ELSE
          -- Insert new primary image
          INSERT INTO product_images (product_id, url, sort)
          VALUES (product_id_uuid, image_url, 0);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure a matching trigger exists on visual_editor_data to sync into products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_visual_to_product'
  ) THEN
    CREATE TRIGGER trg_sync_visual_to_product
    AFTER INSERT OR UPDATE ON public.visual_editor_data
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_visual_editor_to_product();
  END IF;
END $$;

-- Ensure a trigger exists on products to reflect back into visual editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_product_to_visual'
  ) THEN
    CREATE TRIGGER trg_sync_product_to_visual
    AFTER INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_product_to_visual_editor();
  END IF;
END $$;