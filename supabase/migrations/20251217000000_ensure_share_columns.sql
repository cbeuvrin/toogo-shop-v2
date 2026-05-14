-- Ensure share columns exist in tenant_settings
-- This addresses the issue where settings cannot be saved because the columns are missing

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS share_title text,
ADD COLUMN IF NOT EXISTS share_description text,
ADD COLUMN IF NOT EXISTS share_image_url text;

-- Allow public access to tenant_settings for read (needed for SEO)
-- Note: Assuming RLS might be enabled, we ensure a policy exists for public read.
-- However, if RLS is OFF, this does nothing harmlessly. 
-- We'll wrap in a safe block or just leave it to columns first to avoid complexity.
-- Just adding columns is the safest "step 1".
