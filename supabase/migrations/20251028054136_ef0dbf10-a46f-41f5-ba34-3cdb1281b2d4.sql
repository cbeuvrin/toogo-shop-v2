-- Paso 1: Agregar variation_id a order_items
ALTER TABLE order_items 
ADD COLUMN variation_id UUID REFERENCES product_variations(id);

CREATE INDEX idx_order_items_variation_id ON order_items(variation_id);

-- Paso 2: Modificar trigger decrement_product_stock para soportar variaciones
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  product_type_val TEXT;
  current_stock INTEGER;
BEGIN
  -- Determinar si es producto simple o variable
  SELECT product_type INTO product_type_val 
  FROM products 
  WHERE id = NEW.product_id;

  IF product_type_val = 'variable' THEN
    -- CASO 1: Producto Variable - usar variation_id
    IF NEW.variation_id IS NULL THEN
      RAISE EXCEPTION 'variation_id is required for variable products';
    END IF;

    -- Obtener stock de la variación
    SELECT stock INTO current_stock 
    FROM product_variations 
    WHERE id = NEW.variation_id;

    -- Validar stock
    IF current_stock < NEW.qty THEN
      RAISE EXCEPTION 'Insufficient stock for variation %. Available: %, Requested: %', 
        NEW.variation_id, current_stock, NEW.qty;
    END IF;

    -- Decrementar stock de la variación
    UPDATE product_variations 
    SET stock = stock - NEW.qty,
        updated_at = now()
    WHERE id = NEW.variation_id;

  ELSE
    -- CASO 2: Producto Simple - usar product_id
    SELECT stock INTO current_stock 
    FROM products 
    WHERE id = NEW.product_id;

    IF current_stock < NEW.qty THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        NEW.product_id, current_stock, NEW.qty;
    END IF;

    UPDATE products 
    SET stock = stock - NEW.qty,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Paso 3: Modificar trigger restore_product_stock para soportar variaciones
CREATE OR REPLACE FUNCTION public.restore_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  product_type_val TEXT;
BEGIN
  -- Determinar si es producto simple o variable
  SELECT product_type INTO product_type_val 
  FROM products 
  WHERE id = OLD.product_id;

  IF product_type_val = 'variable' AND OLD.variation_id IS NOT NULL THEN
    -- Restaurar stock de la variación
    UPDATE product_variations 
    SET stock = stock + OLD.qty,
        updated_at = now()
    WHERE id = OLD.variation_id;
  ELSE
    -- Restaurar stock del producto simple
    UPDATE products 
    SET stock = stock + OLD.qty,
        updated_at = now()
    WHERE id = OLD.product_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;