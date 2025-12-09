-- Update get_public_store_data_demo to include base64 images
CREATE OR REPLACE FUNCTION public.get_public_store_data_demo(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t_record RECORD;
  result jsonb;
BEGIN
  -- Find active tenant by ID
  SELECT id, name, primary_host, extra_hosts, plan, status
  INTO t_record
  FROM tenants
  WHERE id = p_tenant_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'tenant_not_found',
      'tenant_id', p_tenant_id
    );
  END IF;

  -- Aggregate data needed by the public storefront
  result := jsonb_build_object(
    'ok', true,
    'tenant', jsonb_build_object(
      'id', t_record.id,
      'name', t_record.name,
      'primary_host', t_record.primary_host,
      'plan', t_record.plan,
      'status', t_record.status
    ),
    'settings', (
      SELECT COALESCE(to_jsonb(ts) - 'id' - 'tenant_id', '{}'::jsonb)
      FROM tenant_settings ts
      WHERE ts.tenant_id = t_record.id
      LIMIT 1
    ),
    'visual', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'element_type', ved.element_type,
          'element_id', ved.element_id,
          'data', ved.data,
          'updated_at', ved.updated_at
        ) ORDER BY ved.updated_at DESC),
        '[]'::jsonb
      )
      FROM visual_editor_data ved
      WHERE ved.tenant_id = t_record.id
    ),
    'banners', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'id', b.id,
          'title', b.title,
          'description', b.description,
          'image_url', b.image_url,
          'link_url', b.link_url,
          'sort', b.sort
        ) ORDER BY b.sort ASC),
        '[]'::jsonb
      )
      FROM banners b
      WHERE b.tenant_id = t_record.id AND b.active = true
    ),
    'products', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'description', p.description,
            'price_usd', p.price_usd,
            'price_mxn', p.price_mxn,
            'stock', p.stock,
            'status', p.status,
            'sku', p.sku,
            'product_type', p.product_type,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'images', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', pi.id,
                  'url', pi.url,
                  'sort', pi.sort
                ) ORDER BY pi.sort ASC
              )
              FROM product_images pi
              WHERE pi.product_id = p.id
            ), '[]'::jsonb),
            'categories', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', c.id,
                  'name', c.name,
                  'slug', c.slug
                )
              )
              FROM categories c
              JOIN product_categories pc ON c.id = pc.category_id
              WHERE pc.product_id = p.id
            ), '[]'::jsonb)
          )
          ORDER BY p.created_at DESC
        ), '[]'::jsonb
      )
      FROM products p
      WHERE p.tenant_id = t_record.id AND p.status = 'active'
      LIMIT 50
    ),
    'categories', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'sort', c.sort,
          'show_on_home', c.show_on_home
        ) ORDER BY c.sort ASC, c.created_at ASC),
        '[]'::jsonb
      )
      FROM categories c
      WHERE c.tenant_id = t_record.id
    )
  );

  RETURN result;
END;
$function$;

-- Update get_public_store_data to properly include images
CREATE OR REPLACE FUNCTION public.get_public_store_data(p_host text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t_record RECORD;
  result jsonb;
BEGIN
  -- Find active tenant by host
  SELECT id, name, primary_host, extra_hosts, plan, status
  INTO t_record
  FROM tenants
  WHERE status = 'active'
    AND (
      primary_host = p_host OR (extra_hosts IS NOT NULL AND p_host = ANY(extra_hosts))
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'tenant_not_found',
      'host', p_host
    );
  END IF;

  -- Aggregate data needed by the public storefront
  result := jsonb_build_object(
    'ok', true,
    'tenant', jsonb_build_object(
      'id', t_record.id,
      'name', t_record.name,
      'primary_host', t_record.primary_host,
      'plan', t_record.plan,
      'status', t_record.status
    ),
    'settings', (
      SELECT COALESCE(to_jsonb(ts) - 'id' - 'tenant_id', '{}'::jsonb)
      FROM tenant_settings ts
      WHERE ts.tenant_id = t_record.id
      LIMIT 1
    ),
    'visual', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'element_type', ved.element_type,
          'element_id', ved.element_id,
          'data', ved.data,
          'updated_at', ved.updated_at
        ) ORDER BY ved.updated_at DESC),
        '[]'::jsonb
      )
      FROM visual_editor_data ved
      WHERE ved.tenant_id = t_record.id
    ),
    'products', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'description', p.description,
            'price_usd', p.price_usd,
            'price_mxn', p.price_mxn,
            'stock', p.stock,
            'status', p.status,
            'sku', p.sku,
            'product_type', p.product_type,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'images', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', pi.id,
                  'url', pi.url,
                  'sort', pi.sort
                ) ORDER BY pi.sort ASC
              )
              FROM product_images pi
              WHERE pi.product_id = p.id
            ), '[]'::jsonb)
          )
          ORDER BY p.created_at DESC
        ), '[]'::jsonb
      )
      FROM products p
      WHERE p.tenant_id = t_record.id AND p.status = 'active'
    ),
    'categories', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'sort', c.sort,
          'show_on_home', c.show_on_home
        ) ORDER BY c.sort ASC, c.created_at ASC),
        '[]'::jsonb
      )
      FROM categories c
      WHERE c.tenant_id = t_record.id
    ),
    'product_categories', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
          'product_id', pc.product_id,
          'category_id', pc.category_id
        )),
        '[]'::jsonb
      )
      FROM product_categories pc
      WHERE pc.product_id IN (SELECT id FROM products WHERE tenant_id = t_record.id)
    )
  );

  RETURN result;
END;
$function$;