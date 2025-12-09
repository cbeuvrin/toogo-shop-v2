-- Fase 1: Agregar nueva columna sale_price_mxn a products
ALTER TABLE products 
ADD COLUMN sale_price_mxn NUMERIC DEFAULT 0;

-- Fase 2: Migrar datos existentes de price_usd a sale_price_mxn en products
UPDATE products 
SET sale_price_mxn = price_usd;

-- Fase 3: Eliminar columna price_usd de products
ALTER TABLE products 
DROP COLUMN price_usd;

-- Fase 4: Agregar nueva columna sale_price_mxn a order_items
ALTER TABLE order_items 
ADD COLUMN sale_price_mxn NUMERIC;

-- Fase 5: Migrar datos existentes de price_usd a sale_price_mxn en order_items
UPDATE order_items 
SET sale_price_mxn = price_usd;

-- Fase 6: Eliminar columna price_usd de order_items
ALTER TABLE order_items 
DROP COLUMN price_usd;