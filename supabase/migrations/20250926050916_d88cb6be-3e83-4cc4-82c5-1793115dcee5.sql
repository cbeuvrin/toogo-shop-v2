-- Create function to get product variations with variable details
CREATE OR REPLACE FUNCTION public.get_product_variations_with_details(product_id_param UUID)
RETURNS TABLE(
  id UUID,
  product_id UUID,
  combination JSONB,
  stock INTEGER,
  price_modifier NUMERIC,
  sku TEXT,
  variable_names JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.product_id,
    pv.combination,
    pv.stock,
    pv.price_modifier,
    pv.sku,
    (
      SELECT jsonb_object_agg(pvars.id::text, pvars.name)
      FROM product_variables pvars
      WHERE pvars.tenant_id = (SELECT tenant_id FROM products WHERE id = product_id_param)
    ) as variable_names
  FROM product_variations pv
  WHERE pv.product_id = product_id_param;
END;
$$;

-- Create function to get product variables for a product
CREATE OR REPLACE FUNCTION public.get_product_variables(product_id_param UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  is_required BOOLEAN,
  variable_values JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.name,
    pv.type,
    pv.is_required,
    COALESCE(
      (
        SELECT jsonb_agg(pvv.value ORDER BY pvv.sort_order)
        FROM product_variable_values pvv
        WHERE pvv.variable_id = pv.id
      ),
      '[]'::jsonb
    ) as variable_values
  FROM product_variables pv
  JOIN product_variable_assignments pva ON pv.id = pva.variable_id
  WHERE pva.product_id = product_id_param
    AND pva.is_active = true
    AND pv.is_active = true
  ORDER BY pv.sort_order, pv.name;
END;
$$;