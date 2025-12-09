-- Create public SELECT policy for tenant_settings to allow public access to store configuration
CREATE POLICY "Public can view public tenant settings" 
ON tenant_settings 
FOR SELECT 
USING (true);