-- Add Plaid KYC fields to profiles table
-- This migration adds kyc_verified_at and plaid_item_id columns
-- kyc_status already exists, but we'll ensure it supports the required values

-- Add kyc_verified_at timestamp (nullable)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;

-- Add plaid_item_id to store the Plaid item ID after linking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plaid_item_id text;

-- Add index on kyc_status for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON profiles(kyc_status);

-- Add index on plaid_item_id for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plaid_item_id ON profiles(plaid_item_id) WHERE plaid_item_id IS NOT NULL;

-- Note: kyc_status already exists as TEXT with default 'Pending'
-- We'll use values: 'unverified', 'pending', 'verified', 'failed'
-- Existing 'Pending' values will need to be migrated to 'pending' if needed
-- For now, we'll support both in the application code

