-- Create default tenant_settings for tenants that don't have them
INSERT INTO tenant_settings (
  tenant_id,
  primary_color,
  secondary_color,
  shipping_enabled,
  shipping_type,
  shipping_minimum_amount,
  shipping_flat_rate,
  shipping_zones_enabled,
  shipping_zones_config,
  exchange_rate_mode,
  exchange_rate_value,
  mercadopago_public_key,
  paypal_client_id,
  whatsapp_number,
  ga4_id,
  fb_pixel,
  logo_url
)
SELECT 
  t.id as tenant_id,
  '#000000' as primary_color,
  '#ffffff' as secondary_color,
  false as shipping_enabled,
  'free_minimum' as shipping_type,
  NULL as shipping_minimum_amount,
  NULL as shipping_flat_rate,
  false as shipping_zones_enabled,
  '{"zones": {}, "default_rate": 0}'::jsonb as shipping_zones_config,
  'manual' as exchange_rate_mode,
  20.0 as exchange_rate_value,
  NULL as mercadopago_public_key,
  NULL as paypal_client_id,
  NULL as whatsapp_number,
  NULL as ga4_id,
  NULL as fb_pixel,
  NULL as logo_url
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings ts 
  WHERE ts.tenant_id = t.id
);