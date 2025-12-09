-- Add is_active column to product_variables table
ALTER TABLE public.product_variables 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for better performance when filtering active variables
CREATE INDEX idx_product_variables_active ON public.product_variables(tenant_id, is_active) WHERE is_active = true;