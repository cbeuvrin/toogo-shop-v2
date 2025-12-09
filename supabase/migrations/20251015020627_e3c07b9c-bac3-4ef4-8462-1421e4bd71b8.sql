-- Add DNS tracking columns to domain_purchases if they don't exist
ALTER TABLE domain_purchases
ADD COLUMN IF NOT EXISTS dns_instructions_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dns_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dns_check_attempts INTEGER DEFAULT 0;