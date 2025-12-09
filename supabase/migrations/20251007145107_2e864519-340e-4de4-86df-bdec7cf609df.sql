-- Add customer email template column to tenant_settings
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS custom_email_template_customer JSONB DEFAULT NULL;

COMMENT ON COLUMN tenant_settings.custom_email_template_customer IS 'Custom email template for customer order confirmations. Only editable by Pro plan users.';