-- Crear tabla de cupones para tiendas de tenants
CREATE TABLE tenant_store_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Información básica del cupón
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo y valor del descuento
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC,
  
  -- Restricciones de aplicación
  minimum_purchase_amount NUMERIC DEFAULT 0,
  applies_to_all_products BOOLEAN DEFAULT true,
  applies_to_products JSONB DEFAULT '[]'::jsonb,
  applies_to_categories JSONB DEFAULT '[]'::jsonb,
  
  -- Límites de uso
  max_total_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Estado y fechas
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint única para código por tenant
  UNIQUE(tenant_id, code)
);

-- Índices para mejorar performance
CREATE INDEX idx_tenant_store_coupons_tenant ON tenant_store_coupons(tenant_id);
CREATE INDEX idx_tenant_store_coupons_code ON tenant_store_coupons(code);
CREATE INDEX idx_tenant_store_coupons_active ON tenant_store_coupons(is_active, expires_at);

-- Tabla para rastrear uso de cupones
CREATE TABLE tenant_coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES tenant_store_coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenant_coupon_usage
CREATE INDEX idx_tenant_coupon_usage_coupon ON tenant_coupon_usage(coupon_id);
CREATE INDEX idx_tenant_coupon_usage_user ON tenant_coupon_usage(user_id);
CREATE INDEX idx_tenant_coupon_usage_tenant ON tenant_coupon_usage(tenant_id);

-- Agregar columnas a orders para cupones de tienda
ALTER TABLE orders ADD COLUMN store_coupon_id UUID REFERENCES tenant_store_coupons(id);
ALTER TABLE orders ADD COLUMN store_discount_amount NUMERIC DEFAULT 0;

-- Habilitar RLS
ALTER TABLE tenant_store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policies para tenant_store_coupons
CREATE POLICY "tenant_admins_manage_store_coupons"
ON tenant_store_coupons FOR ALL
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "active_store_coupons_public_view"
ON tenant_store_coupons FOR SELECT
USING (
  is_active = true AND 
  expires_at > NOW() AND
  starts_at <= NOW()
);

-- Policies para tenant_coupon_usage
CREATE POLICY "system_insert_coupon_usage"
ON tenant_coupon_usage FOR INSERT
WITH CHECK (true);

CREATE POLICY "tenant_admins_view_coupon_usage"
ON tenant_coupon_usage FOR SELECT
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_tenant_store_coupons_updated_at
BEFORE UPDATE ON tenant_store_coupons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();