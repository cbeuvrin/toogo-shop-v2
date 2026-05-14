-- Migration to add hero_image_shape setting
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS hero_image_shape text DEFAULT 'organic';
