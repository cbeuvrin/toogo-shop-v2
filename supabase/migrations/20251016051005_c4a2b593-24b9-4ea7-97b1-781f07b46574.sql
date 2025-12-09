-- Eliminar la columna price_usd de products ya que ahora solo usamos MXN
ALTER TABLE public.products
DROP COLUMN IF EXISTS price_usd;