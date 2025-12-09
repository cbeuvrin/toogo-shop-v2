-- Fix security issues: Replace the view with a security definer function
-- This addresses the security warnings about exposed auth.users and security definer view

DROP VIEW IF EXISTS public.user_analytics;

-- Create a security definer function to get user analytics safely
CREATE OR REPLACE FUNCTION public.get_user_analytics(
  limit_count INT DEFAULT 100,
  offset_count INT DEFAULT 0,
  search_email TEXT DEFAULT '',
  filter_plan plan_type DEFAULT NULL,
  filter_role app_role DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  whatsapp TEXT,
  registered_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  tenant_id UUID,
  tenant_name TEXT,
  plan plan_type,
  tenant_status tenant_status,
  role app_role,
  total_products BIGINT,
  total_orders BIGINT,
  total_revenue_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT tenant_id, COUNT(*) as count
    FROM products
    GROUP BY tenant_id
  ) product_count ON t.id = product_count.tenant_id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) as count
    FROM orders
    GROUP BY tenant_id
  ) order_count ON t.id = order_count.tenant_id
  LEFT JOIN (
    SELECT tenant_id, SUM(total_usd) as total_usd
    FROM orders
    WHERE status = 'paid'
    GROUP BY tenant_id
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

-- Create function to get global metrics safely
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
  total_users BIGINT,
  total_tenants BIGINT,
  free_tenants BIGINT,
  basic_tenants BIGINT,
  premium_tenants BIGINT,
  total_revenue NUMERIC,
  new_users_24h BIGINT,
  new_users_7d BIGINT,
  new_users_30d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only superadmins can access this function
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Superadmin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users)::BIGINT,
    (SELECT COUNT(*) FROM tenants)::BIGINT,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'free')::BIGINT,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'basic')::BIGINT,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'premium')::BIGINT,
    (SELECT COALESCE(SUM(total_usd), 0) FROM orders WHERE status = 'paid')::NUMERIC,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT;
END;
$$;