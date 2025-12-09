-- Agregar columnas de colores faltantes en tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS navbar_bg_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS product_card_bg_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS footer_bg_color text DEFAULT '#1a1a1a';

-- Comentario: Estas columnas son necesarias para el editor visual de colores en Dashboard3
-- navbar_bg_color: Color de fondo de la barra de navegación
-- product_card_bg_color: Color de fondo de las tarjetas de productos
-- footer_bg_color: Color de fondo del pie de página