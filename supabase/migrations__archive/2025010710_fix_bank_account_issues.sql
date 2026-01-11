-- Fix Bank Account Issues - Cleanup and Enforcement
-- This migration fixes duplicate indexes, missing triggers, and NOT NULL constraint

-- ============================================================================
-- 1. Remove duplicate "one primary per user" unique indexes
--    (Keep exactly ONE partial unique index per user where is_primary = true)
-- ============================================================================

-- Drop ALL known legacy/duplicate unique indexes for "primary".
-- We'll recreate a single canonical one below.
DROP INDEX IF EXISTS public.bank_accounts_one_primary_per_user_idx;
DROP INDEX IF EXISTS public.bank_accounts_one_primary_per_user;
DROP INDEX IF EXISTS public.one_primary_bank_per_user;

-- (Optional) if you ever had any other legacy names, add them here:
-- DROP INDEX IF EXISTS public.bank_accounts_one_primary_per_user_idx_old;

-- Create the single canonical unique index (one primary per user)
CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_one_primary_per_user
  ON public.bank_accounts (user_id)
  WHERE is_primary = true;

-- ============================================================================
-- 2. Ensure integrity trigger is properly installed on orders
-- ============================================================================

-- First, ensure the function exists
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
  -- Skip validation if bank_account_id is NULL (shouldn't happen after NOT NULL, but safe)
  IF NEW.bank_account_id IS NULL THEN
    RETURN NEW;
  END IF;
  
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

-- Drop existing triggers if they exist (cleanup)
DROP TRIGGER IF EXISTS trigger_validate_order_bank_account_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_validate_order_bank_account_update ON public.orders;
DROP TRIGGER IF EXISTS trg_validate_order_bank_account_ownership ON public.orders;

-- Create the trigger with proper name and conditions
-- This fires on INSERT or UPDATE of bank_account_id or customer_id
CREATE TRIGGER trg_validate_order_bank_account_ownership
  BEFORE INSERT OR UPDATE OF bank_account_id, customer_id
  ON public.orders
  FOR EACH ROW
  WHEN (NEW.bank_account_id IS NOT NULL)
  EXECUTE FUNCTION validate_order_bank_account_ownership();

-- Add comments
COMMENT ON FUNCTION validate_order_bank_account_ownership() IS 
  'Validates that orders.bank_account_id belongs to the same user as orders.customer_id. Enforced at database level via trigger.';

COMMENT ON TRIGGER trg_validate_order_bank_account_ownership ON public.orders IS 
  'Validates bank account ownership when creating or updating orders. Fires on INSERT or UPDATE of bank_account_id/customer_id.';

-- ============================================================================
-- 3. Fix NOT NULL constraint (backfill + enforce)
-- ============================================================================

-- Step A: Backfill existing NULLs with user's primary bank account
UPDATE public.orders o
SET bank_account_id = ba.id
FROM public.bank_accounts ba
WHERE o.bank_account_id IS NULL
  AND ba.user_id = o.customer_id
  AND ba.is_primary = true;

-- Step B: If any orders still have NULL (no primary bank), use first bank account
UPDATE public.orders o
SET bank_account_id = ba.id
FROM (
  SELECT DISTINCT ON (user_id) 
    id, user_id
  FROM public.bank_accounts
  WHERE user_id IN (
    SELECT DISTINCT customer_id 
    FROM public.orders 
    WHERE bank_account_id IS NULL
  )
  ORDER BY user_id, created_at ASC
) ba
WHERE o.bank_account_id IS NULL
  AND ba.user_id = o.customer_id;

-- Step C: Handle orders with no bank accounts (legacy orders)
-- For users with no bank accounts, we'll create a system placeholder bank account
-- This allows us to enforce NOT NULL while preserving historical data
DO $$
DECLARE
  v_null_count integer;
  v_user_id uuid;
  v_placeholder_bank_id uuid;
  v_user_email text;
BEGIN
  -- Check if there are still NULLs
  SELECT COUNT(*) INTO v_null_count
  FROM public.orders
  WHERE bank_account_id IS NULL;
  
  IF v_null_count > 0 THEN
    -- For each user with orders but no bank accounts, create a placeholder
    FOR v_user_id IN 
      SELECT DISTINCT customer_id 
      FROM public.orders 
      WHERE bank_account_id IS NULL
        AND customer_id NOT IN (SELECT DISTINCT user_id FROM bank_accounts)
    LOOP
      -- Get user email for logging
      SELECT email INTO v_user_email
      FROM auth.users
      WHERE id = v_user_id;
      
      -- Create a placeholder bank account for this user
      INSERT INTO public.bank_accounts (
        id,
        user_id,
        plaid_item_id,
        bank_institution_name,
        bank_institution_logo_url,
        bank_last4,
        is_primary,
        kyc_status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        'LEGACY_PLACEHOLDER_' || v_user_id::text,
        'Legacy Account',
        NULL,
        '0000',
        true, -- Make it primary so it's used as default
        'unverified',
        now(),
        now()
      )
      RETURNING id INTO v_placeholder_bank_id;
      
      -- Update orders for this user
      UPDATE public.orders
      SET bank_account_id = v_placeholder_bank_id
      WHERE customer_id = v_user_id
        AND bank_account_id IS NULL;
      
      RAISE NOTICE 'Created placeholder bank account for user % (email: %) with % orders', 
        v_user_id, 
        COALESCE(v_user_email, 'unknown'),
        (SELECT COUNT(*) FROM public.orders WHERE customer_id = v_user_id AND bank_account_id = v_placeholder_bank_id);
    END LOOP;
    
    -- Final check
    SELECT COUNT(*) INTO v_null_count
    FROM public.orders
    WHERE bank_account_id IS NULL;
    
    IF v_null_count > 0 THEN
      RAISE EXCEPTION 'Cannot enforce NOT NULL: % orders still have NULL bank_account_id after creating placeholder accounts. This should not happen.', v_null_count;
    END IF;
  END IF;
END $$;

-- Step D: Enforce NOT NULL constraint (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'bank_account_id'
      AND is_nullable = 'YES'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ALTER COLUMN bank_account_id SET NOT NULL';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.orders.bank_account_id IS 
  'The bank account used to fund this order. Refunds must go back to this account, not the current primary. Required (NOT NULL).';
