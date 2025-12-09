-- Agregar soporte para imágenes en mensajes de WhatsApp
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;