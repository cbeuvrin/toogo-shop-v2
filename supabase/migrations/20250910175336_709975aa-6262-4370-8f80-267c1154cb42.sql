-- Add shipping zones configuration columns to tenant_settings table
ALTER TABLE public.tenant_settings 
ADD COLUMN shipping_zones_enabled boolean DEFAULT false,
ADD COLUMN shipping_zones_config jsonb DEFAULT '{"default_rate": 0, "zones": {}}'::jsonb;