-- Create bank_accounts table to support multiple bank accounts per user
-- This replaces the single bank account fields in the profiles table

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL,
  bank_institution_name text,
  bank_institution_logo_url text,
  bank_last4 text,
  is_primary boolean DEFAULT false,
  kyc_status text DEFAULT 'verified',
  kyc_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure one primary account per user
  UNIQUE(user_id, plaid_item_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_plaid_item_id ON bank_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON bank_accounts(user_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own bank accounts
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own bank accounts
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own bank accounts
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own bank accounts
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to ensure only one primary account per user
CREATE OR REPLACE FUNCTION ensure_single_primary_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  -- If this account is being set as primary, unset all other primary accounts for this user
  IF NEW.is_primary = true THEN
    UPDATE bank_accounts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary account
DROP TRIGGER IF EXISTS ensure_single_primary_bank_account_trigger ON bank_accounts;
CREATE TRIGGER ensure_single_primary_bank_account_trigger
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_bank_account();

