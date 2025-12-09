-- Tabla de cupones
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC,
  
  applicable_to TEXT NOT NULL CHECK (applicable_to IN ('membership', 'domain', 'both')),
  
  expires_at TIMESTAMPTZ NOT NULL,
  max_total_uses INTEGER NOT NULL CHECK (max_total_uses > 0),
  max_uses_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_uses_per_user > 0),
  
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de uso de cupones
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  
  discount_applied NUMERIC NOT NULL,
  applied_to TEXT NOT NULL,
  
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(coupon_id, user_id)
);

-- RLS policies
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Superadmins pueden gestionar cupones
CREATE POLICY "superadmins_can_manage_coupons" ON coupons
  FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Usuarios autenticados pueden ver cupones activos y válidos
CREATE POLICY "users_can_view_active_coupons" ON coupons
  FOR SELECT USING (is_active = true AND expires_at > now());

-- Superadmins pueden ver todo el uso de cupones
CREATE POLICY "superadmins_can_view_coupon_usage" ON coupon_usage
  FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Sistema puede registrar uso de cupones
CREATE POLICY "system_can_insert_coupon_usage" ON coupon_usage
  FOR INSERT WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, expires_at);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();