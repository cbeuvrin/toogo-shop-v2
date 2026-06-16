-- SECURITY: anti brute-force for email verification codes.
-- The 6-digit code had no attempt limit, so it could be guessed by trying many
-- codes for a known email. We add an `attempts` counter; verify-code rejects and
-- invalidates the code after a few wrong tries, forcing a new code request.
ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
