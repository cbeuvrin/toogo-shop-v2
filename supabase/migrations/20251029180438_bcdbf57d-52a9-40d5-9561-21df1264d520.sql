-- Agregar campos para compartir en redes sociales a tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS share_title TEXT,
ADD COLUMN IF NOT EXISTS share_description TEXT,
ADD COLUMN IF NOT EXISTS share_image_url TEXT;