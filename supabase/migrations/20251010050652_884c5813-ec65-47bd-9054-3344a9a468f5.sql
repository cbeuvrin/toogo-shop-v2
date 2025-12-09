-- Add metadata column to domain_purchases for tracking retry attempts and errors
ALTER TABLE domain_purchases 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN domain_purchases.metadata IS 'Stores retry attempts, error logs, and purchase history';
