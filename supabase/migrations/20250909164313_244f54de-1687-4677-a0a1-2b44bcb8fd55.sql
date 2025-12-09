-- Fix security warnings by setting search_path for new functions
DROP FUNCTION IF EXISTS decrement_product_stock();
DROP FUNCTION IF EXISTS restore_product_stock();

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