-- Add logo_position to tenant_settings so the LogoEditModal can let users
-- align the logo left / center / right within the storefront header.
-- Defaults to center which matches the current Indico hardcoded layout.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS logo_position text DEFAULT 'center'
  CHECK (logo_position IS NULL OR logo_position IN ('left','center','right'));
