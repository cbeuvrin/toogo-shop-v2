-- Agregar datos de contacto para los 2 tenants BASIC existentes
INSERT INTO visual_editor_data (tenant_id, element_type, element_id, data)
VALUES 
  (
    '8142575f-b30d-4691-8bd5-1b632efeef35',
    'contact',
    'store_contact',
    '{"phone": "", "email": "admin@ketingmedia.com", "address": "", "hours": "Lunes a Viernes: 9:00 AM - 6:00 PM", "whatsapp": "", "facebook": "", "instagram": ""}'::jsonb
  ),
  (
    'ad1e084f-c4f1-4610-8805-ea533c75b6bd',
    'contact',
    'store_contact',
    '{"phone": "", "email": "ads@ketingmedia.com", "address": "", "hours": "Lunes a Viernes: 9:00 AM - 6:00 PM", "whatsapp": "", "facebook": "", "instagram": ""}'::jsonb
  )
ON CONFLICT (tenant_id, element_type, element_id) DO NOTHING;