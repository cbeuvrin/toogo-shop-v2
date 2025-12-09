-- SECURITY FIX: Remove sensitive payment credentials from tenant_settings table
-- These will be moved to encrypted Supabase secrets for security

-- Remove sensitive payment credential columns from tenant_settings
ALTER TABLE public.tenant_settings 
DROP COLUMN IF EXISTS mercadopago_access_token,
DROP COLUMN IF EXISTS paypal_client_secret;

-- Keep public/non-sensitive fields like mercadopago_public_key and paypal_client_id
-- as these are safe to store in the database