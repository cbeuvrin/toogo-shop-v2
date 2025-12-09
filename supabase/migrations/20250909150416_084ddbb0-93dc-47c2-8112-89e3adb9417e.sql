-- Create admin activity logs table for auditing
CREATE TABLE public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmins can access admin logs
CREATE POLICY "superadmins_can_manage_admin_logs" ON public.admin_activity_logs
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_admin_logs_admin_user ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_logs_target_user ON admin_activity_logs(target_user_id);
CREATE INDEX idx_admin_logs_created_at ON admin_activity_logs(created_at);
CREATE INDEX idx_admin_logs_action_type ON admin_activity_logs(action_type);

-- Create a view for user analytics (fixed enum value)
CREATE OR REPLACE VIEW public.user_analytics AS
SELECT 
  u.id,
  u.email,
  u.created_at as registered_at,
  u.last_sign_in_at,
  u.raw_user_meta_data,
  t.id as tenant_id,
  t.name as tenant_name,
  t.plan,
  t.status as tenant_status,
  ur.role,
  COALESCE(product_count.count, 0) as total_products,
  COALESCE(order_count.count, 0) as total_orders,
  COALESCE(order_revenue.total_usd, 0) as total_revenue_usd
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
) order_revenue ON t.id = order_revenue.tenant_id;

-- Function to log admin activities
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_tenant_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_activity_logs (
    admin_user_id,
    action_type,
    target_user_id,
    target_tenant_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_user_id,
    p_target_tenant_id,
    p_description,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;