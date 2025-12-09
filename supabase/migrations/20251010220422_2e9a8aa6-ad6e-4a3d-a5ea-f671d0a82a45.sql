-- Migración: Agregar soporte para Openprovider en domain_purchases
-- Fecha: 2025-01-10

-- Agregar columnas específicas de Openprovider
ALTER TABLE domain_purchases
  ADD COLUMN IF NOT EXISTS openprovider_domain_id BIGINT,
  ADD COLUMN IF NOT EXISTS openprovider_handle TEXT;

-- Actualizar default provider a openprovider
ALTER TABLE domain_purchases 
  ALTER COLUMN provider SET DEFAULT 'openprovider';

-- Crear índice para mejorar búsquedas por provider
CREATE INDEX IF NOT EXISTS idx_domain_purchases_provider 
  ON domain_purchases(provider);

-- Comentarios para documentación
COMMENT ON COLUMN domain_purchases.openprovider_domain_id 
  IS 'ID del dominio en Openprovider (retornado en response al registrar)';
COMMENT ON COLUMN domain_purchases.openprovider_handle 
  IS 'Handle de contacto usado para registrar este dominio en Openprovider';