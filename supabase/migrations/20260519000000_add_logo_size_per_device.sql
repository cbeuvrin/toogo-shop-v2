-- Per-device logo size for Indico (and any template that opts in). Falls
-- back to logo_size (desktop) when the device-specific column is null.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS logo_size_mobile integer
  CHECK (logo_size_mobile IS NULL OR (logo_size_mobile >= 1 AND logo_size_mobile <= 30));

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS logo_size_tablet integer
  CHECK (logo_size_tablet IS NULL OR (logo_size_tablet >= 1 AND logo_size_tablet <= 30));
