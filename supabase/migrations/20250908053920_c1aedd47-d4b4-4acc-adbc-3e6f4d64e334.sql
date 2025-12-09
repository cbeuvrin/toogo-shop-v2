-- Create table for Dashboard 2 settings
CREATE TABLE public.dashboard2_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard2_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant admins can manage their dashboard2 settings" 
ON public.dashboard2_settings 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create table for visual editor data
CREATE TABLE public.visual_editor_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  element_type text NOT NULL, -- 'logo', 'banner', 'product', 'category', 'contact'
  element_id text NOT NULL, -- unique identifier for the element
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, element_type, element_id)
);

-- Enable RLS
ALTER TABLE public.visual_editor_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant admins can manage their editor data" 
ON public.visual_editor_data 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard2_settings_updated_at
BEFORE UPDATE ON public.dashboard2_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visual_editor_data_updated_at
BEFORE UPDATE ON public.visual_editor_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();