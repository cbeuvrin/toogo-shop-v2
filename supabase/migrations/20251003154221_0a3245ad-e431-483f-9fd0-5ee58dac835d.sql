-- Security Fix: Explicitly deny anonymous access to orders table
-- This prevents unauthorized users from accessing sensitive customer PII
-- (email, phone, addresses) stored in the orders table

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "anonymous_users_cannot_access_orders" ON public.orders;

-- Create explicit deny policy for anonymous users on orders table
CREATE POLICY "anonymous_users_cannot_access_orders"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Security Fix: Explicitly deny anonymous access to verification_codes table
-- This prevents enumeration of user emails and interference with verification process

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "anonymous_users_cannot_access_verification_codes" ON public.verification_codes;

-- Create explicit deny policy for anonymous users on verification_codes table
CREATE POLICY "anonymous_users_cannot_access_verification_codes"
ON public.verification_codes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);