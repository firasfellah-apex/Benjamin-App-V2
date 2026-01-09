-- Add soft-disconnect support to bank_accounts table
-- This allows disconnecting bank accounts while retaining historical references for orders

-- Add columns for soft disconnect
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS disconnected_at timestamptz;

-- Add index for filtering active accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active 
  ON public.bank_accounts(user_id, is_active) 
  WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN public.bank_accounts.is_active IS 
  'Whether this bank account is active and can be used for new orders. Set to false when disconnected.';
COMMENT ON COLUMN public.bank_accounts.disconnected_at IS 
  'Timestamp when the bank account was disconnected. NULL for active accounts.';

-- Update the ensure_single_primary_bank_account function to only consider active accounts
CREATE OR REPLACE FUNCTION ensure_single_primary_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  -- If this account is being set as primary, unset all other primary accounts for this user
  -- Only consider active accounts
  IF NEW.is_primary = true AND NEW.is_active = true THEN
    UPDATE bank_accounts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent setting disconnected accounts as primary
CREATE OR REPLACE FUNCTION prevent_inactive_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to set an inactive account as primary, prevent it
  IF NEW.is_primary = true AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Cannot set inactive bank account as primary';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent inactive primary
DROP TRIGGER IF EXISTS prevent_inactive_primary_trigger ON bank_accounts;
CREATE TRIGGER prevent_inactive_primary_trigger
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_inactive_primary();

