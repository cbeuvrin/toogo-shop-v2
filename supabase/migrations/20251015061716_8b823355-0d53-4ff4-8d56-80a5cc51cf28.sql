-- Add logo_size column to tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN logo_size integer DEFAULT 5 CHECK (logo_size >= 1 AND logo_size <= 10);