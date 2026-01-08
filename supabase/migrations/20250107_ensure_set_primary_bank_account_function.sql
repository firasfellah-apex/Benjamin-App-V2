-- Ensure rpc_set_primary_bank_account function exists
-- This function atomically sets a bank account as primary for a user

CREATE OR REPLACE FUNCTION rpc_set_primary_bank_account(
  p_bank_account_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bank_account bank_accounts%ROWTYPE;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify bank account exists and belongs to user
  SELECT * INTO v_bank_account
  FROM bank_accounts
  WHERE id = p_bank_account_id
    AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found or access denied';
  END IF;
  
  -- Atomic transaction: set all to false, then set chosen one to true
  -- This prevents "0 primary" or "2 primaries" if something fails mid-way
  UPDATE bank_accounts
  SET is_primary = false,
      updated_at = now()
  WHERE user_id = v_user_id
    AND is_primary = true;
  
  UPDATE bank_accounts
  SET is_primary = true,
      updated_at = now()
  WHERE id = p_bank_account_id
    AND user_id = v_user_id;
  
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    -- This should never happen due to the partial unique index, but handle gracefully
    RAISE EXCEPTION 'Multiple primary accounts detected. Please contact support.';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_set_primary_bank_account(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_set_primary_bank_account(uuid) IS 
  'Atomically sets a bank account as primary. Unsets all other primary accounts for the user in a single transaction. Prevents race conditions.';

