-- Agregar campos de personalización de colores a tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS store_background_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS product_card_hover_color TEXT DEFAULT '#000000';