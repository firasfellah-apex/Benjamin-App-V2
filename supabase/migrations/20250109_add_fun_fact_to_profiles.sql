-- Add fun_fact column to profiles table for runner personalization
-- This allows runners to share a fun fact that appears in customer delivery flows

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS fun_fact TEXT;

-- Add comment
COMMENT ON COLUMN profiles.fun_fact IS 'Optional fun fact about the runner, displayed to customers during delivery to build trust and connection';









