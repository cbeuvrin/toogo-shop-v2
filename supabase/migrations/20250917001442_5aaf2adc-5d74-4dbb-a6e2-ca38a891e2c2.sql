-- Update system_settings with correct membership pricing
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'membership_pricing',
  '{
    "plans": {
      "pro_monthly": {
        "name": "Plan Pro Mensual",
        "price_mxn": 299,
        "period": "month",
        "billing_cycle": "monthly",
        "auto_billing": true,
        "description": "Cobro automático mensual"
      },
      "pro_annual": {
        "name": "Plan Pro Anual", 
        "price_mxn": 3120,
        "period": "year",
        "billing_cycle": "annual",
        "auto_billing": true,
        "description": "Cobro automático anual - 2 meses gratis",
        "savings_months": 2
      }
    }
  }'::jsonb,
  'Configuración de precios para membresías Pro con facturación automática'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();