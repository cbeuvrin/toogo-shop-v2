-- Initialize system_settings with default email templates
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'email_template_customer',
  jsonb_build_object(
    'subject', 'Tu pedido ha sido recibido - Orden #{numero_orden}',
    'greeting', 'Hola {nombre_cliente}, ¡Gracias por tu compra!',
    'mainMessage', 'Hemos recibido tu pedido correctamente y lo estamos procesando. Te notificaremos cuando esté listo para envío.\n\nSi tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.\n\n¡Gracias por confiar en {nombre_tienda}!',
    'footerMessage', 'Saludos cordiales,\nEl equipo de {nombre_tienda}'
  ),
  'Template de email para clientes - configuración global'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();