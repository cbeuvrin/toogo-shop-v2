-- Add shipping configuration columns to tenant_settings table
ALTER TABLE public.tenant_settings 
ADD COLUMN shipping_enabled boolean DEFAULT false,
ADD COLUMN shipping_type text DEFAULT 'free_minimum',
ADD COLUMN shipping_minimum_amount numeric DEFAULT NULL,
ADD COLUMN shipping_flat_rate numeric DEFAULT NULL;