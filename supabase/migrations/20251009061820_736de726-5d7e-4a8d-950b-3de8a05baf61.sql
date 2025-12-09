-- Actualizar system_settings para cambiar pro a basic manteniendo toda la estructura
UPDATE system_settings
SET setting_value = jsonb_build_object(
  'plans', jsonb_build_object(
    'basic_annual', jsonb_build_object(
      'name', 'Plan Basic Anual',
      'period', 'year',
      'price_mxn', 3120,
      'description', 'Cobro automático anual - 2 meses gratis',
      'auto_billing', true,
      'billing_cycle', 'annual',
      'savings_months', 2
    ),
    'basic_monthly', jsonb_build_object(
      'name', 'Plan Basic Mensual',
      'period', 'month',
      'price_mxn', 299,
      'description', 'Cobro automático mensual',
      'auto_billing', true,
      'billing_cycle', 'monthly'
    )
  )
)
WHERE setting_key = 'membership_pricing';

-- Crear tenant beuvrin123 para recuperar la compra
INSERT INTO tenants (name, primary_host, plan, status, owner_user_id)
VALUES ('beuvrin123', 'beuvrin123.toogo.mx', 'basic', 'active', '4f115acf-d0af-40b3-b86e-61758d1d1fe6')
ON CONFLICT DO NOTHING;

-- Asignar rol tenant_admin
INSERT INTO user_roles (user_id, tenant_id, role)
SELECT '4f115acf-d0af-40b3-b86e-61758d1d1fe6', id, 'tenant_admin'
FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Registrar dominio beuvrin123.com
INSERT INTO domain_purchases (tenant_id, domain, provider, status, dns_verified_bool, sandbox_bool)
SELECT id, 'beuvrin123.com', 'porkbun', 'active', true, false
FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Crear orden con el payment_ref de MercadoPago
INSERT INTO orders (
  tenant_id, 
  user_id, 
  total_mxn, 
  total_usd, 
  status, 
  payment_provider, 
  payment_ref,
  customer_name,
  customer_email
)
SELECT 
  id,
  '4f115acf-d0af-40b3-b86e-61758d1d1fe6',
  236.95,
  11.85,
  'paid',
  'mercadopago',
  '128651217013',
  'Carlos Beuvrin',
  'ads@ketingmedia.com'
FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Registrar uso del cupón BEUVRIN2024
INSERT INTO coupon_usage (coupon_id, user_id, tenant_id, discount_applied, applied_to)
SELECT 
  c.id,
  '4f115acf-d0af-40b3-b86e-61758d1d1fe6',
  t.id,
  284.05,
  'membership'
FROM coupons c
CROSS JOIN tenants t
WHERE c.code = 'BEUVRIN2024' AND t.name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Inicializar tenant_settings
INSERT INTO tenant_settings (tenant_id)
SELECT id FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Inicializar user_onboarding_progress
INSERT INTO user_onboarding_progress (tenant_id)
SELECT id FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;

-- Crear categoría por defecto
INSERT INTO categories (tenant_id, name, slug)
SELECT id, 'General', 'general' FROM tenants WHERE name = 'beuvrin123'
ON CONFLICT DO NOTHING;