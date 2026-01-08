-- Optional: Make plaid_item_id nullable in bank_accounts table
-- ONLY run this if you truly support non-Plaid bank accounts (manual entry, etc.)
-- 
-- WARNING: This changes the schema to allow bank accounts without Plaid.
-- Make sure your application logic handles NULL plaid_item_id values.

-- Make plaid_item_id nullable
ALTER TABLE public.bank_accounts
  ALTER COLUMN plaid_item_id DROP NOT NULL;

-- Note: The unique constraint (user_id, plaid_item_id) will still work
-- PostgreSQL allows multiple NULLs in unique constraints, so:
-- - Multiple rows with same user_id and plaid_item_id = NULL are allowed
-- - This might not be desired behavior if you want to prevent duplicate manual entries
--
-- If you need to prevent duplicate NULL entries per user, you'd need a partial unique index:
-- CREATE UNIQUE INDEX bank_accounts_user_id_null_plaid_item_id 
--   ON bank_accounts (user_id) 
--   WHERE plaid_item_id IS NULL;

COMMENT ON COLUMN public.bank_accounts.plaid_item_id IS 
  'Plaid item ID. NULL for non-Plaid bank accounts (manual entry, etc.)';

