-- Add share_approval_status and DRAFT columns to tenant_settings
-- This allows us to store the 'proposed' changes without affecting the live site immediately

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS share_approval_status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS share_title_draft text,
ADD COLUMN IF NOT EXISTS share_description_draft text,
ADD COLUMN IF NOT EXISTS share_image_url_draft text;

-- Optional: Copy current live values to draft so they aren't empty initially
UPDATE public.tenant_settings 
SET 
  share_title_draft = share_title,
  share_description_draft = share_description,
  share_image_url_draft = share_image_url
WHERE share_title_draft IS NULL;
