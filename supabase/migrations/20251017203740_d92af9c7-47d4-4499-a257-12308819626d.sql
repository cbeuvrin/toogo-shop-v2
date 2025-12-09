-- Add unique constraint on tenant_id to support ON CONFLICT in upserts
-- This allows the upsert operation in useOnboardingInteraction to work correctly
-- with ON CONFLICT (tenant_id) clause

ALTER TABLE public.user_onboarding_progress
ADD CONSTRAINT user_onboarding_progress_tenant_id_key 
UNIQUE (tenant_id);