-- Bump tenant_settings.logo_size upper bound from 10 to 30 so the LogoEditModal
-- slider (max=30) doesn't hit the original CHECK constraint and silently fail.
-- The frontend renders height as logo_size * 16px, so 30 = 480px tall (sensible cap).

ALTER TABLE tenant_settings DROP CONSTRAINT IF EXISTS tenant_settings_logo_size_check;
ALTER TABLE tenant_settings ADD CONSTRAINT tenant_settings_logo_size_check
  CHECK (logo_size IS NULL OR (logo_size >= 1 AND logo_size <= 30));
