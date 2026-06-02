-- Service / "by order" item type.
--
-- product_type = 'service' makes the item behave like a quote/contact
-- rather than a cart product:
--   - stock is hidden + not validated
--   - price can be 'fixed', 'starting_from $X' or 'a cotizar' (NULL price ok)
--   - CTA opens WhatsApp instead of "Agregar al carrito"
--
-- Existing rows keep pricing_mode NULL and the frontend treats that as
-- 'fixed' so nothing changes for current stores.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT
  CHECK (pricing_mode IS NULL OR pricing_mode IN ('fixed','starting_from','quote'));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cta_label TEXT;

-- The original CHECK only allowed 'simple' | 'variable'. Replace it so
-- 'service' rows can be inserted/updated.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;
ALTER TABLE products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('simple','variable','service'));
