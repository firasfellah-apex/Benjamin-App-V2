-- Secure Bank Account Refunds - Complete Implementation
-- This migration implements all security and integrity checks for bank account refund routing

-- ============================================================================
-- 1. Make bank_account_id NOT NULL (required for all orders)
-- ============================================================================

-- First, set any NULL values to a default (if any exist)
-- This handles existing orders before making the column NOT NULL
DO $$
DECLARE
  v_user_id uuid;
  v_primary_bank_id uuid;
BEGIN
  -- For each order with NULL bank_account_id, set it to the user's primary bank
  FOR v_user_id IN 
    SELECT DISTINCT customer_id 
    FROM orders 
    WHERE bank_account_id IS NULL
  LOOP
    -- Get the user's primary bank account
    SELECT id INTO v_primary_bank_id
    FROM bank_accounts
    WHERE user_id = v_user_id
      AND is_primary = true
    LIMIT 1;
    
    -- If no primary, get first bank account
    IF v_primary_bank_id IS NULL THEN
      SELECT id INTO v_primary_bank_id
      FROM bank_accounts
      WHERE user_id = v_user_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
    
    -- Update orders with the bank account
    IF v_primary_bank_id IS NOT NULL THEN
      UPDATE orders
      SET bank_account_id = v_primary_bank_id
      WHERE customer_id = v_user_id
        AND bank_account_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- Now make the column NOT NULL
ALTER TABLE public.orders
  ALTER COLUMN bank_account_id SET NOT NULL;

-- ============================================================================
-- 2. Ensure primary constraint is correct (DB-enforced)
-- ============================================================================

-- Drop existing index if it has a different name
DROP INDEX IF EXISTS public.bank_accounts_one_primary_per_user_idx;

-- Create the correct partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_one_primary_per_user
  ON public.bank_accounts (user_id)
  WHERE is_primary = true;

-- Add comment
COMMENT ON INDEX bank_accounts_one_primary_per_user IS 
  'Ensures only one bank account can be marked as primary per user. Enforced at database level. Prevents race conditions.';

-- ============================================================================
-- 3. Create atomic "set primary" function (server-side transaction)
-- ============================================================================

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

-- ============================================================================
-- 4. Bank-account-to-order integrity checks (trigger)
-- ============================================================================

-- Create function to validate bank_account_id ownership
CREATE OR REPLACE FUNCTION validate_order_bank_account_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_user_id uuid;
  v_order_user_id uuid;
BEGIN
  -- Get the user_id of the bank account
  SELECT user_id INTO v_bank_user_id
  FROM bank_accounts
  WHERE id = NEW.bank_account_id;
  
  -- Get the user_id of the order (customer_id)
  v_order_user_id := NEW.customer_id;
  
  -- Validate ownership
  IF v_bank_user_id IS NULL THEN
    RAISE EXCEPTION 'Bank account not found: %', NEW.bank_account_id;
  END IF;
  
  IF v_bank_user_id != v_order_user_id THEN
    RAISE EXCEPTION 'Bank account ownership mismatch: bank belongs to user %, but order belongs to user %', 
      v_bank_user_id, v_order_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_validate_order_bank_account_insert ON public.orders;
CREATE TRIGGER trigger_validate_order_bank_account_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.bank_account_id IS NOT NULL)
  EXECUTE FUNCTION validate_order_bank_account_ownership();

-- Create trigger for UPDATE (if bank_account_id changes)
DROP TRIGGER IF EXISTS trigger_validate_order_bank_account_update ON public.orders;
CREATE TRIGGER trigger_validate_order_bank_account_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.bank_account_id IS DISTINCT FROM OLD.bank_account_id AND NEW.bank_account_id IS NOT NULL)
  EXECUTE FUNCTION validate_order_bank_account_ownership();

-- Add comments
COMMENT ON FUNCTION validate_order_bank_account_ownership() IS 
  'Validates that orders.bank_account_id belongs to the same user as orders.customer_id. Enforced at database level via trigger.';

COMMENT ON TRIGGER trigger_validate_order_bank_account_insert ON public.orders IS 
  'Validates bank account ownership when creating orders.';

COMMENT ON TRIGGER trigger_validate_order_bank_account_update ON public.orders IS 
  'Validates bank account ownership when updating order bank_account_id.';

