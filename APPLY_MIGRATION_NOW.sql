-- ============================================================================
-- URGENT: Apply Bank Institution Migration
-- ============================================================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click "Run"
-- This will fix the 500 error when connecting bank accounts

-- Add bank institution fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_name text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_logo_url text;

-- Add index on bank_institution_name for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_bank_institution_name ON profiles(bank_institution_name) WHERE bank_institution_name IS NOT NULL;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('bank_institution_name', 'bank_institution_logo_url');

-- Expected result: You should see both columns listed
-- bank_institution_name | text | YES
-- bank_institution_logo_url | text | YES

