-- Create system_settings table for global configuration
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage system settings
CREATE POLICY "superadmins_can_manage_system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default pricing configuration
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('membership_pricing', '{
  "pro_plan": {
    "price_usd": 19.00,
    "price_cents": 1900,
    "period": "month",
    "stripe_price_id": null
  },
  "enterprise_plan": {
    "price_usd": 99.00,
    "price_cents": 9900,
    "period": "month",
    "stripe_price_id": null
  }
}', 'Pricing configuration for membership plans');

-- Insert default payment configuration for memberships
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('membership_payment_config', '{
  "stripe": {
    "enabled": false,
    "publishable_key": ""
  },
  "paypal": {
    "enabled": false,
    "client_id": ""
  }
}', 'Payment method configuration for platform memberships');

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();