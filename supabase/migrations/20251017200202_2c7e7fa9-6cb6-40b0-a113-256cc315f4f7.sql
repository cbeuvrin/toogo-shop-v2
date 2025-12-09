-- Add step_5_confirmed column to track when user explicitly confirms completion
ALTER TABLE user_onboarding_progress 
ADD COLUMN step_5_confirmed BOOLEAN DEFAULT FALSE;