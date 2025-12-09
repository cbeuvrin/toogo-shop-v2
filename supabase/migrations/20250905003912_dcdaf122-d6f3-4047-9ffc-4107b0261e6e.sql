-- Add features column to products table
ALTER TABLE public.products 
ADD COLUMN features TEXT[] DEFAULT '{}';

-- Add comment to the new column
COMMENT ON COLUMN public.products.features IS 'Array of product features (max 4 items)';

-- Create a function to validate features array length
CREATE OR REPLACE FUNCTION validate_product_features()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if features array has more than 4 items
  IF array_length(NEW.features, 1) > 4 THEN
    RAISE EXCEPTION 'Products cannot have more than 4 features';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate features on insert/update
CREATE TRIGGER validate_product_features_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_features();