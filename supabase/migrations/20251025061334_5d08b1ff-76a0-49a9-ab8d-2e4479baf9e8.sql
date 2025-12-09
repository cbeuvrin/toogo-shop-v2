-- Agregar 4 nuevas columnas a tenant_settings para personalización de header y footer
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS header_icon_color TEXT DEFAULT '#6b7280',
ADD COLUMN IF NOT EXISTS header_icon_scale DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS footer_icon_color TEXT DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS footer_icon_scale DECIMAL(3,2) DEFAULT 1.0;

-- Constraints de validación para los scales
ALTER TABLE tenant_settings
ADD CONSTRAINT check_header_scale CHECK (header_icon_scale >= 0.5 AND header_icon_scale <= 2.0),
ADD CONSTRAINT check_footer_scale CHECK (footer_icon_scale >= 0.5 AND footer_icon_scale <= 2.0);

-- Actualizar footer_bg_color a blanco si está en negro (para registros existentes)
UPDATE tenant_settings
SET footer_bg_color = '#ffffff'
WHERE footer_bg_color = '#1a1a1a' OR footer_bg_color IS NULL;