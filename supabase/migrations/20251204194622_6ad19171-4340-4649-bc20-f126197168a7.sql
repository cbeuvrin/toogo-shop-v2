-- Add verification columns to whatsapp_users table
-- These are additive changes that won't affect existing functionality

ALTER TABLE public.whatsapp_users 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_code text,
ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz;

-- Add index for faster lookups during verification
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_verification 
ON public.whatsapp_users (phone_number, verification_code) 
WHERE verification_code IS NOT NULL;