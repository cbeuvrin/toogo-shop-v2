-- Step 1: Create platform_orders table for Toogo infrastructure sales
CREATE TABLE IF NOT EXISTS public.platform_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('domain', 'subscription', 'combined')),
  total_mxn numeric NOT NULL DEFAULT 0,
  total_usd numeric NOT NULL DEFAULT 0,
  payment_ref text,
  payment_provider text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_orders
CREATE POLICY "Superadmins can manage all platform orders"
  ON public.platform_orders
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own platform orders"
  ON public.platform_orders
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_orders_user_id ON public.platform_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_orders_tenant_id ON public.platform_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_orders_status ON public.platform_orders(status);
CREATE INDEX IF NOT EXISTS idx_platform_orders_created_at ON public.platform_orders(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_platform_orders_updated_at
  BEFORE UPDATE ON public.platform_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 2: Migrate existing infrastructure orders from orders table
-- Only migrate orders that have NO order_items (these are Toogo infrastructure purchases)
INSERT INTO public.platform_orders (
  id,
  user_id,
  tenant_id,
  order_type,
  total_mxn,
  total_usd,
  payment_ref,
  payment_provider,
  status,
  metadata,
  created_at,
  updated_at
)
SELECT 
  o.id,
  o.user_id,
  o.tenant_id,
  CASE 
    WHEN o.payment_ref LIKE '%domain%' THEN 'domain'
    WHEN o.payment_ref LIKE '%subscription%' THEN 'subscription'
    ELSE 'combined'
  END as order_type,
  o.total_mxn,
  o.total_usd,
  o.payment_ref,
  o.payment_provider::text,
  o.status::text,
  jsonb_build_object(
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'migrated_from_orders', true
  ) as metadata,
  o.created_at,
  o.updated_at
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop and recreate get_admin_metrics function with new columns
DROP FUNCTION IF EXISTS public.get_admin_metrics();

CREATE FUNCTION public.get_admin_metrics()
RETURNS TABLE(
  total_users bigint,
  total_tenants bigint,
  free_tenants bigint,
  basic_tenants bigint,
  premium_tenants bigint,
  total_revenue numeric,
  total_tenant_sales numeric,
  new_users_24h bigint,
  new_users_7d bigint,
  new_users_30d bigint
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
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM tenants)::BIGINT as total_tenants,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'free')::BIGINT as free_tenants,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'basic')::BIGINT as basic_tenants,
    (SELECT COUNT(*) FROM tenants WHERE plan = 'premium')::BIGINT as premium_tenants,
    -- Toogo platform revenue (from platform_orders)
    (SELECT COALESCE(SUM(total_usd), 0) FROM platform_orders WHERE status = 'paid')::NUMERIC as total_revenue,
    -- Tenant e-commerce sales (from orders with order_items)
    (SELECT COALESCE(SUM(o.total_usd), 0) 
     FROM orders o 
     WHERE o.status = 'paid' 
     AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id))::NUMERIC as total_tenant_sales,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT as new_users_24h,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT as new_users_7d,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT as new_users_30d;
END;
$$;