-- Create secure RPC for payment configuration display
-- This function returns ONLY safe, public payment config data for display in dashboard
-- SECRET credentials (access tokens, client secrets) are NEVER returned by this function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_tenant_payment_display_config(uuid);

CREATE OR REPLACE FUNCTION public.get_tenant_payment_display_config(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify caller has tenant_admin role for this tenant
  IF NOT (has_role(auth.uid(), 'tenant_admin'::app_role, p_tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Tenant admin role required for tenant %', p_tenant_id;
  END IF;

  -- Return ONLY public/display-safe payment configuration
  -- IMPORTANT: mercadopago_public_key and paypal_client_id are PUBLIC keys meant for frontend use
  -- SECRET credentials (MercadoPago access token, PayPal client secret) are stored in Supabase secrets
  SELECT jsonb_build_object(
    'mercadopago_public_key', COALESCE(ts.mercadopago_public_key, ''),
    'paypal_client_id', COALESCE(ts.paypal_client_id, ''),
    'whatsapp_number', COALESCE(ts.whatsapp_number, ''),
    'whatsapp_message', COALESCE(ts.whatsapp_message, 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}')
  ) INTO result
  FROM tenant_settings ts
  WHERE ts.tenant_id = p_tenant_id
  LIMIT 1;

  -- If no settings exist, return empty config
  IF result IS NULL THEN
    result := jsonb_build_object(
      'mercadopago_public_key', '',
      'paypal_client_id', '',
      'whatsapp_number', '',
      'whatsapp_message', 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}'
    );
  END IF;

  RETURN result;
END;
$$;

-- Add security documentation
COMMENT ON FUNCTION public.get_tenant_payment_display_config(uuid) IS 
'Secure RPC for retrieving payment configuration display data.

SECURITY MODEL:
- Only tenant admins and superadmins can call this function
- Returns ONLY public/display-safe payment provider credentials
- Public keys returned: mercadopago_public_key, paypal_client_id (safe for frontend)
- Secret keys NEVER returned: These are stored in Supabase secrets and only accessed by edge functions
  * MercadoPago: access_token stored as secret
  * PayPal: client_secret stored as secret
- This function follows principle of least privilege by exposing only necessary display data

WHY THESE ARE SAFE TO EXPOSE:
- mercadopago_public_key: Public key designed for frontend checkout forms
- paypal_client_id: Public identifier designed for frontend PayPal buttons
- whatsapp_number: Business contact info (already public on website)
- whatsapp_message: Template message (contains no sensitive data)

All actual payment processing uses SECRET credentials stored securely in Supabase secrets.';

-- Add security comment on tenant_settings table
COMMENT ON TABLE public.tenant_settings IS 
'Tenant-specific configuration and settings.

PAYMENT SECURITY MODEL:
- Public keys (mercadopago_public_key, paypal_client_id): Safe for frontend, accessed via get_tenant_payment_display_config()
- Secret keys: Stored in Supabase secrets, accessed only by edge functions with service role
- Direct table access restricted to tenant admins via RLS
- Recommended: Use get_tenant_payment_display_config() RPC for display data instead of direct table access';

COMMENT ON COLUMN public.tenant_settings.mercadopago_public_key IS 
'⚠️ PUBLIC KEY (not secret): MercadoPago public key for frontend checkout forms. 
Safe to expose to tenant admins. Actual secret (access_token) stored in Supabase secrets.';

COMMENT ON COLUMN public.tenant_settings.paypal_client_id IS 
'⚠️ PUBLIC IDENTIFIER (not secret): PayPal client ID for frontend buttons. 
Safe to expose to tenant admins. Actual secret (client_secret) stored in Supabase secrets.';