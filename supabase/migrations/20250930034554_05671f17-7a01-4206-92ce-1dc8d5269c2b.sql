-- Insert default email and WhatsApp templates into system_settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
(
  'email_template_vendor',
  '{
    "subject": "Nueva orden recibida - {order_id}",
    "greeting": "¡Hola equipo de {store_name}!",
    "mainMessage": "Han recibido una nueva orden. Aquí están los detalles:",
    "orderDetails": "Orden ID: {order_id}\nCliente: {customer_name}\nEmail: {customer_email}\nTeléfono: {customer_phone}\nTotal: ${total_amount}\n\nProductos:\n{order_items}",
    "footerMessage": "Revisa tu dashboard para más detalles y gestionar la orden."
  }',
  'Template for vendor notification emails when new orders are received'
),
(
  'email_template_customer', 
  '{
    "subject": "Confirmación de tu orden - {order_id}",
    "greeting": "¡Hola {customer_name}!",
    "mainMessage": "Gracias por tu compra en {store_name}. Hemos recibido tu orden y la estamos procesando.",
    "orderDetails": "Orden ID: {order_id}\nTotal: ${total_amount}\nFecha: {order_date}\n\nProductos ordenados:\n{order_items}",
    "footerMessage": "Te contactaremos pronto con los detalles de envío. ¡Gracias por elegir {store_name}!"
  }',
  'Template for customer confirmation emails when orders are placed'
),
(
  'whatsapp_template',
  '{
    "message": "Hola 👋, quisiera más información sobre\n\n📦 {product_name}\nSKU: {sku}\nPrecio: ${price} MXN\n\n¿Está disponible y cuáles son las formas de pago?"
  }',
  'Default WhatsApp message template for product inquiries'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now(),
  description = EXCLUDED.description;