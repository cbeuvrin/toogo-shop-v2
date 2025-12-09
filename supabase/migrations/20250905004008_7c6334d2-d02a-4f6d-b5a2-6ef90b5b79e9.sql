-- Fix security warning: Set search_path for the function
CREATE OR REPLACE FUNCTION validate_product_features()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if features array has more than 4 items
  IF array_length(NEW.features, 1) > 4 THEN
    RAISE EXCEPTION 'Products cannot have more than 4 features';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;