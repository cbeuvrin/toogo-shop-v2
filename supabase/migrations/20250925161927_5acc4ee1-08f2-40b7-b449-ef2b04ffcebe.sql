-- Update the default WhatsApp message template to be more professional
UPDATE tenant_settings 
SET whatsapp_message = 'Hola 👋, quisiera más información sobre

📦 {product_name}
SKU: {sku}
Precio: ${price} MXN

¿Está disponible y cuáles son las formas de pago?'
WHERE whatsapp_message IS NULL OR whatsapp_message = 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}';

-- Update the default value for new tenant_settings
ALTER TABLE tenant_settings 
ALTER COLUMN whatsapp_message 
SET DEFAULT 'Hola 👋, quisiera más información sobre

📦 {product_name}
SKU: {sku}
Precio: ${price} MXN

¿Está disponible y cuáles son las formas de pago?';