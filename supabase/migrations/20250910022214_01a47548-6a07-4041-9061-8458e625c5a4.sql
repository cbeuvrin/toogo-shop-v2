-- Create product_variations table for handling stock per combination
CREATE TABLE public.product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  combination JSONB NOT NULL DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  price_modifier NUMERIC DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Create policies for product_variations
CREATE POLICY "Tenant users can manage product variations" 
ON public.product_variations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM products p 
  WHERE p.id = product_variations.product_id 
  AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM products p 
  WHERE p.id = product_variations.product_id 
  AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  )
));

CREATE POLICY "Users can view product variations" 
ON public.product_variations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM products p 
  WHERE p.id = product_variations.product_id 
  AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  )
));

-- Add product_type column to products table
ALTER TABLE public.products 
ADD COLUMN product_type TEXT DEFAULT 'simple' CHECK (product_type IN ('simple', 'variable'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_variations_updated_at
  BEFORE UPDATE ON public.product_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_product_variations_product_id ON public.product_variations(product_id);
CREATE INDEX idx_product_variations_combination ON public.product_variations USING GIN(combination);