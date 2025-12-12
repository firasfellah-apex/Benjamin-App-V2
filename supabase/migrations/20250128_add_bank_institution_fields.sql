-- Add bank institution fields to profiles table
-- This migration adds bank_institution_name and bank_institution_logo_url columns
-- These fields store the bank name and logo URL from Plaid when a customer connects their bank

-- Add bank_institution_name to store the bank name (e.g., "Chase", "Bank of America")
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_name text;

-- Add bank_institution_logo_url to store the logo URL from Plaid
-- Plaid provides logos as base64-encoded images, which can be stored as data URLs
-- or fetched and stored in our own storage. For now, we'll store the data URL.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_logo_url text;

-- Add index on bank_institution_name for faster queries (optional, but useful for admin views)
CREATE INDEX IF NOT EXISTS idx_profiles_bank_institution_name ON profiles(bank_institution_name) WHERE bank_institution_name IS NOT NULL;

