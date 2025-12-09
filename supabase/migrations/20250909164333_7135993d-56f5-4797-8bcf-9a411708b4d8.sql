-- Drop triggers first, then functions, then recreate everything with proper security
DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;
DROP TRIGGER IF EXISTS trigger_restore_stock ON order_items;
DROP FUNCTION IF EXISTS decrement_product_stock() CASCADE;
DROP FUNCTION IF EXISTS restore_product_stock() CASCADE;

-- Recreate functions with proper search_path security setting
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock INTO product_stock 
  FROM products 
  WHERE id = NEW.product_id;

  -- Check if there's enough stock
  IF product_stock < NEW.qty THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
      NEW.product_id, product_stock, NEW.qty;
  END IF;

  -- Decrement stock
  UPDATE products 
  SET stock = stock - NEW.qty,
      updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

-- Recreate restore stock function with proper search_path
CREATE OR REPLACE FUNCTION restore_product_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Restore stock when order item is deleted
  UPDATE products 
  SET stock = stock + OLD.qty,
      updated_at = now()
  WHERE id = OLD.product_id;

  RETURN OLD;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_product_stock();

CREATE TRIGGER trigger_restore_stock
  AFTER DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_product_stock();