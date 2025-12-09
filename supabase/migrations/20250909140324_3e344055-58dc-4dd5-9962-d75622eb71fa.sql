-- Create dashboard4_settings table for tracking dashboard 4 configuration
CREATE TABLE public.dashboard4_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_step INTEGER DEFAULT 1,
  wizard_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_onboarding_progress table for tracking user progress
CREATE TABLE public.user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  step_1_logo BOOLEAN DEFAULT false,
  step_2_products BOOLEAN DEFAULT false,
  step_3_branding BOOLEAN DEFAULT false,
  step_4_payments BOOLEAN DEFAULT false,
  step_5_publish BOOLEAN DEFAULT false,
  total_progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dashboard4_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboard4_settings
CREATE POLICY "Tenant admins can manage their dashboard4 settings" 
ON public.dashboard4_settings 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create policies for user_onboarding_progress
CREATE POLICY "Tenant admins can manage their onboarding progress" 
ON public.user_onboarding_progress 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dashboard4_settings_updated_at
BEFORE UPDATE ON public.dashboard4_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_onboarding_progress_updated_at
BEFORE UPDATE ON public.user_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();