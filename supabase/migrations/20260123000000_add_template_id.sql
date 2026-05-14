-- Add template_id column to tenant_settings if it doesn't exist
-- This is a safe migration that won't break existing functionality
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'template_id') THEN
        ALTER TABLE public.tenant_settings 
        ADD COLUMN template_id text NOT NULL DEFAULT 'default';
        
        RAISE NOTICE 'Added template_id column to tenant_settings';
    ELSE
        RAISE NOTICE 'Column template_id already exists in tenant_settings';
    END IF;
END $$;
