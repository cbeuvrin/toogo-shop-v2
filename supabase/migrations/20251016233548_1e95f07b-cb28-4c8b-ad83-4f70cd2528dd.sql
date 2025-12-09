-- Update get_public_store_data to include categories in products (matching demo version)
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
  -- SECURITY FIX: Only expose safe/display fields from tenant_settings
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
      SELECT jsonb_build_object(
        'logo_url', ts.logo_url,
        'primary_color', ts.primary_color,
        'secondary_color', ts.secondary_color,
        'shipping_enabled', ts.shipping_enabled,
        'shipping_type', ts.shipping_type,
        'shipping_minimum_amount', ts.shipping_minimum_amount,
        'shipping_flat_rate', ts.shipping_flat_rate,
        'shipping_zones_enabled', ts.shipping_zones_enabled,
        'shipping_zones_config', ts.shipping_zones_config,
        'exchange_rate_mode', ts.exchange_rate_mode,
        'exchange_rate_value', ts.exchange_rate_value,
        'ga4_id', ts.ga4_id,
        'fb_pixel', ts.fb_pixel
      )
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
            'sale_price_mxn', p.sale_price_mxn,
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