-- Create product variables table
CREATE TABLE public.product_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dropdown', 'text', 'color')),
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product variable values table
CREATE TABLE public.product_variable_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variable_id UUID NOT NULL REFERENCES public.product_variables(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product variable assignments table
CREATE TABLE public.product_variable_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES public.product_variables(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, variable_id)
);

-- Enable RLS
ALTER TABLE public.product_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variable_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variable_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variables
CREATE POLICY "Tenant users can view their variables" 
ON public.product_variables 
FOR SELECT 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admins can manage variables" 
ON public.product_variables 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for product_variable_values
CREATE POLICY "Users can view variable values" 
ON public.product_variable_values 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.product_variables pv 
  WHERE pv.id = product_variable_values.variable_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, pv.tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, pv.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
));

CREATE POLICY "Tenant admins can manage variable values" 
ON public.product_variable_values 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.product_variables pv 
  WHERE pv.id = product_variable_values.variable_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, pv.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.product_variables pv 
  WHERE pv.id = product_variable_values.variable_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, pv.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
));

-- RLS Policies for product_variable_assignments
CREATE POLICY "Users can view product variable assignments" 
ON public.product_variable_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_variable_assignments.product_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
));

CREATE POLICY "Tenant users can manage product variable assignments" 
ON public.product_variable_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_variable_assignments.product_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p 
  WHERE p.id = product_variable_assignments.product_id 
  AND (has_role(auth.uid(), 'tenant_admin'::app_role, p.tenant_id) OR has_role(auth.uid(), 'tenant_staff'::app_role, p.tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
));

-- Add triggers for updated_at
CREATE TRIGGER update_product_variables_updated_at
BEFORE UPDATE ON public.product_variables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default variables for testing
INSERT INTO public.product_variables (tenant_id, name, type, is_required, sort_order) 
SELECT t.id, 'Talla', 'dropdown', true, 1 FROM public.tenants t LIMIT 1;

INSERT INTO public.product_variables (tenant_id, name, type, is_required, sort_order) 
SELECT t.id, 'Color', 'color', false, 2 FROM public.tenants t LIMIT 1;