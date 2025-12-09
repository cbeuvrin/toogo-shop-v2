-- Backward compatibility: add price_usd column expected by existing triggers on products
-- Ensures updates do not fail with: record "new" has no field "price_usd"
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 0;