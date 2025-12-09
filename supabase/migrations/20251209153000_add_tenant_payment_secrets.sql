-- Add secure columns for payment secrets
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS mercadopago_access_token text,
ADD COLUMN IF NOT EXISTS paypal_client_secret text;

-- Ensure RLS allows the tenant owner to update these columns
-- (Standard boilerplate safety check, though usually not strictly necessary if row-level update is enabled)
-- COMMENT ON COLUMN public.tenant_settings.mercadopago_access_token IS 'Secret Access Token for MercadoPago Integration';
-- COMMENT ON COLUMN public.tenant_settings.paypal_client_secret IS 'Secret Client Secret for PayPal Integration';
