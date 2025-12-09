-- Actualizar system_settings para agregar plan semestral
UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value,
  '{plans,basic_semi_annual}',
  '{
    "name": "Plan Basic Semestral",
    "price_mxn": 1710,
    "period": "6_months",
    "billing_cycle": "semi_annual",
    "description": "Cobro automático semestral - 1 mes gratis",
    "auto_billing": true,
    "savings_months": 1
  }'::jsonb
)
WHERE setting_key = 'membership_pricing';