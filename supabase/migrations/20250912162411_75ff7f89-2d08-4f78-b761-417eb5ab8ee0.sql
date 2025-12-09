-- Fix RPC functions to match declared return types exactly
-- get_user_analytics and get_tenant_analytics

CREATE OR REPLACE FUNCTION public.get_user_analytics(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0,
  search_email text DEFAULT ''::text,
  filter_plan plan_type DEFAULT NULL::plan_type,
  filter_role app_role DEFAULT NULL::app_role
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
    u.id::uuid AS user_id,
    u.email::text AS email,
    (u.raw_user_meta_data->>'first_name')::text AS first_name,
    (u.raw_user_meta_data->>'last_name')::text AS last_name,
    (u.raw_user_meta_data->>'username')::text AS username,
    (u.raw_user_meta_data->>'whatsapp')::text AS whatsapp,
    u.created_at::timestamptz AS registered_at,
    u.last_sign_in_at::timestamptz AS last_sign_in_at,
    t.id::uuid AS tenant_id,
    t.name::text AS tenant_name,
    t.plan::plan_type AS plan,
    t.status::tenant_status AS tenant_status,
    ur.role::app_role AS role,
    COALESCE(product_count.count, 0)::bigint AS total_products,
    COALESCE(order_count.count, 0)::bigint AS total_orders,
    COALESCE(order_revenue.total_usd, 0)::numeric AS total_revenue_usd
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN tenants t ON ur.tenant_id = t.id
  LEFT JOIN (
    SELECT p.tenant_id, COUNT(*)::bigint as count
    FROM products p
    GROUP BY p.tenant_id
  ) product_count ON t.id = product_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, COUNT(*)::bigint as count
    FROM orders o
    GROUP BY o.tenant_id
  ) order_count ON t.id = order_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, SUM(o.total_usd)::numeric as total_usd
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

-- ------------------------------------------------------------------

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
    t.id::uuid AS tenant_id,
    t.name::text AS tenant_name,
    t.primary_host::text AS primary_host,
    t.plan::plan_type AS plan,
    t.status::tenant_status AS status,
    t.created_at::timestamptz AS created_at,
    COALESCE(u.email, 'Sin propietario')::text AS owner_email,
    COALESCE(product_count.count, 0)::bigint AS total_products,
    COALESCE(order_count.count, 0)::bigint AS total_orders,
    COALESCE(order_revenue.total_usd, 0)::numeric AS total_revenue_usd
  FROM tenants t
  LEFT JOIN auth.users u ON t.owner_user_id = u.id
  LEFT JOIN (
    SELECT p.tenant_id, COUNT(*)::bigint as count
    FROM products p
    GROUP BY p.tenant_id
  ) product_count ON t.id = product_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, COUNT(*)::bigint as count
    FROM orders o
    GROUP BY o.tenant_id
  ) order_count ON t.id = order_count.tenant_id
  LEFT JOIN (
    SELECT o.tenant_id, SUM(o.total_usd)::numeric as total_usd
    FROM orders o
    WHERE o.status = 'paid'
    GROUP BY o.tenant_id
  ) order_revenue ON t.id = order_revenue.tenant_id
  ORDER BY t.created_at DESC;
END;
$$;