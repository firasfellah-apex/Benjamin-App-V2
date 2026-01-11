-- Add bank_account_id to orders table for refund routing
-- This ensures refunds always go back to the bank account that funded the order

-- Add column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_bank_account_id 
  ON public.orders(bank_account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.bank_account_id IS 
  'The bank account used to fund this order. Refunds must go back to this account, not the current primary. If the account is disconnected, refunds fallback to current primary.';

-- Add partial unique index: only one primary bank account per user
-- This ensures data integrity at the database level
-- NOTE: This index will be replaced by a clearer-named one in the fix migration
-- Keeping it here for initial setup, but the fix migration will consolidate
CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_one_primary_per_user
  ON public.bank_accounts(user_id)
  WHERE is_primary = true;

-- Add helpful comment
COMMENT ON INDEX bank_accounts_one_primary_per_user IS 
  'Ensures only one bank account can be marked as primary per user. Enforced at database level.';

