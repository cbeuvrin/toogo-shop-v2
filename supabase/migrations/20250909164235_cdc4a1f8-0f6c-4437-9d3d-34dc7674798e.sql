-- Add stock management trigger for inventory updates
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock when order items are created
CREATE TRIGGER trigger_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_product_stock();

-- Add function to restore stock (in case of order cancellation)
CREATE OR REPLACE FUNCTION restore_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Restore stock when order item is deleted
  UPDATE products 
  SET stock = stock + OLD.qty,
      updated_at = now()
  WHERE id = OLD.product_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to restore stock when order items are deleted
CREATE TRIGGER trigger_restore_stock
  AFTER DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_product_stock();

-- Update products table to ensure stock is not null and has default value
UPDATE products SET stock = COALESCE(stock, 0) WHERE stock IS NULL;

-- Add check constraint to prevent negative stock
ALTER TABLE products ADD CONSTRAINT check_positive_stock CHECK (stock >= 0);