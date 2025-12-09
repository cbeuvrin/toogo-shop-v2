-- Eliminar constraint existente que solo permite 'text' y 'audio'
ALTER TABLE whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;

-- Crear nuevo constraint con 'image' incluido
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_message_type_check 
CHECK (message_type = ANY (ARRAY['text', 'audio', 'image']));