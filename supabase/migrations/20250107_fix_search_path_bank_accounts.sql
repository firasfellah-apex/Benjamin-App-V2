-- Fix mutable search_path security issue for ensure_single_primary_bank_account function
-- This prevents search path injection attacks

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

