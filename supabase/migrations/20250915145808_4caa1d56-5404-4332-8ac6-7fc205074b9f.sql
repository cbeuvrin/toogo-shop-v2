-- Add whatsapp_message column to tenant_settings if it doesn't exist
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS whatsapp_message text DEFAULT 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}';

-- Update existing records with default message if they don't have one
UPDATE tenant_settings 
SET whatsapp_message = 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}'
WHERE whatsapp_message IS NULL;