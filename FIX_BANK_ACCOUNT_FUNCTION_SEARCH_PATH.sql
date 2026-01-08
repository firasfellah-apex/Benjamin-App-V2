-- Quick fix: Set search_path for ensure_single_primary_bank_account function
-- Run this in Supabase SQL Editor to resolve the security alert immediately

CREATE OR REPLACE FUNCTION ensure_single_primary_bank_account()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Verify the function has search_path set
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_single_primary_bank_account';

