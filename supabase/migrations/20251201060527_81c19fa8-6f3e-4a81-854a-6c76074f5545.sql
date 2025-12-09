-- Allow authenticated users to read system settings
-- This is needed so tenants can see the WhatsApp bot number configured by admins
CREATE POLICY "authenticated_can_read_system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);