-- Corregir función get_user_analytics para eliminar ambigüedad en tenant_id
DROP FUNCTION IF EXISTS public.get_user_analytics(integer, integer, text, plan_type, app_role);

CREATE OR REPLACE FUNCTION public.get_user_analytics(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0,
  search_email text DEFAULT '',
  filter_plan plan_type DEFAULT NULL,
  filter_role app_role DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  username text,
  whatsapp text,
  registered_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  tenant_id uuid,
  tenant_name text,
  plan plan_type,
  tenant_status tenant_status,
  role app_role,
  total_products bigint,
  total_orders bigint,
  total_revenue_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only superadmins can access this function
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    (u.raw_user_meta_data->>'first_name')::TEXT,
    (u.raw_user_meta_data->>'last_name')::TEXT,
    (u.raw_user_meta_data->>'username')::TEXT,
    (u.raw_user_meta_data->>'whatsapp')::TEXT,
    u.created_at,
    u.last_sign_in_at,
    t.id,
    t.name,
    t.plan,
    t.status,
    ur.role,
    COALESCE(product_count.count, 0),
    COALESCE(order_count.count, 0),
    COALESCE(order_revenue.total_usd, 0)
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN tenants t ON ur.tenant_id = t.id
  LEFT JOIN (
    SELECT p.tenant_id, COUNT(*) as count
    FROM products p
    GROUP BY p.tenant_id
  ) product_count ON t.id = product_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, COUNT(*) as count
    FROM orders o
    GROUP BY o.tenant_id
  ) order_count ON t.id = order_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, SUM(o.total_usd) as total_usd
    FROM orders o
    WHERE o.status = 'paid'
    GROUP BY o.tenant_id
  ) order_revenue ON t.id = order_revenue.tenant_id
  WHERE 
    (search_email = '' OR u.email ILIKE '%' || search_email || '%')
    AND (filter_plan IS NULL OR t.plan = filter_plan)
    AND (filter_role IS NULL OR ur.role = filter_role)
  ORDER BY u.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Crear función para obtener datos de tenants con información del propietario
CREATE OR REPLACE FUNCTION public.get_tenant_analytics()
RETURNS TABLE(
  tenant_id uuid,
  tenant_name text,
  primary_host text,
  plan plan_type,
  status tenant_status,
  created_at timestamp with time zone,
  owner_email text,
  total_products bigint,
  total_orders bigint,
  total_revenue_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only superadmins can access this function
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.primary_host,
    t.plan,
    t.status,
    t.created_at,
    COALESCE(u.email, 'Sin propietario') as owner_email,
    COALESCE(product_count.count, 0),
    COALESCE(order_count.count, 0),
    COALESCE(order_revenue.total_usd, 0)
  FROM tenants t
  LEFT JOIN auth.users u ON t.owner_user_id = u.id
  LEFT JOIN (
    SELECT p.tenant_id, COUNT(*) as count
    FROM products p
    GROUP BY p.tenant_id
  ) product_count ON t.id = product_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, COUNT(*) as count
    FROM orders o
    GROUP BY o.tenant_id
  ) order_count ON t.id = order_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, SUM(o.total_usd) as total_usd
    FROM orders o
    WHERE o.status = 'paid'
    GROUP BY o.tenant_id
  ) order_revenue ON t.id = order_revenue.tenant_id
  ORDER BY t.created_at DESC;
END;
$$;