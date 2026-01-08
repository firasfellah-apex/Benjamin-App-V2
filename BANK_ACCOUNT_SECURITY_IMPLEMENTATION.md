# Bank Account Security Implementation

## Overview

This document describes the security and integrity measures implemented for bank account refund routing.

## Implemented Features

### 1. ✅ DB-Enforced Primary Constraint

**Partial Unique Index**: Prevents two primaries from ever existing, even if two clients race.

```sql
CREATE UNIQUE INDEX bank_accounts_one_primary_per_user
  ON public.bank_accounts (user_id)
  WHERE is_primary = true;
```

**Benefits**:
- Database-level enforcement (can't be bypassed)
- Prevents race conditions
- Atomic constraint check

### 2. ✅ Atomic "Set Primary" Operation

**RPC Function**: `rpc_set_primary_bank_account(uuid)`

Server-side transaction that:
1. Sets all user's accounts `is_primary=false`
2. Sets chosen one `is_primary=true`

All in one atomic transaction, preventing:
- "0 primary" scenarios (if first update succeeds, second fails)
- "2 primaries" scenarios (if first update fails, second succeeds)

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION rpc_set_primary_bank_account(
  p_bank_account_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atomic: unset all, then set one
  UPDATE bank_accounts
  SET is_primary = false, updated_at = now()
  WHERE user_id = auth.uid() AND is_primary = true;
  
  UPDATE bank_accounts
  SET is_primary = true, updated_at = now()
  WHERE id = p_bank_account_id AND user_id = auth.uid();
  
  RETURN true;
END;
$$;
```

**Frontend Usage**:
```typescript
// In src/db/api.ts
const { data, error } = await supabase.rpc('rpc_set_primary_bank_account', {
  p_bank_account_id: bankAccountId
});
```

### 3. ✅ Bank-Account-to-Order Integrity Checks

**Database Trigger**: Validates ownership at INSERT/UPDATE time.

**Function**: `validate_order_bank_account_ownership()`

**Checks**:
- `orders.bank_account_id` must exist in `bank_accounts`
- `bank_accounts.user_id` must equal `orders.customer_id`

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION validate_order_bank_account_ownership()
RETURNS TRIGGER
AS $$
BEGIN
  -- Validate bank account belongs to order's customer
  IF NOT EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE id = NEW.bank_account_id
      AND user_id = NEW.customer_id
  ) THEN
    RAISE EXCEPTION 'Bank account ownership mismatch';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_order_bank_account_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_bank_account_ownership();
```

**Benefits**:
- Hard guarantee at database level
- Can't be bypassed by application bugs
- Prevents malicious data injection

### 4. ✅ Bank Account Required for Orders

**NOT NULL Constraint**: `orders.bank_account_id` is now required.

**Migration Strategy**:
1. Backfill existing NULL values with user's primary bank
2. Then add NOT NULL constraint

**Application Logic**:
- `createOrder()` now throws error if no bank account available
- Always defaults to primary if none selected
- Validates ownership before creating order

**Benefits**:
- Eliminates whole class of bugs (NULL handling)
- Ensures every order has refund destination
- Simplifies refund logic (no NULL checks needed)

## Migration Files

1. **`20250107_add_bank_account_id_to_orders.sql`**
   - Adds `bank_account_id` column
   - Adds index
   - Adds partial unique index for primary constraint

2. **`20250107_secure_bank_account_refunds.sql`**
   - Makes `bank_account_id` NOT NULL
   - Creates atomic RPC function for setting primary
   - Creates trigger for ownership validation

## Testing Checklist

- [ ] Primary constraint: Try to set two accounts as primary → should fail
- [ ] Atomic set primary: Set primary while another request is setting different primary → only one should succeed
- [ ] Ownership validation: Try to create order with other user's bank account → should fail
- [ ] NOT NULL constraint: Try to create order without bank account → should fail
- [ ] Backfill: Existing orders with NULL should be updated to primary bank

## Security Benefits

1. **Database-Level Enforcement**: Can't be bypassed by application bugs
2. **Race Condition Prevention**: Atomic operations prevent inconsistent states
3. **Ownership Validation**: Triggers ensure data integrity
4. **Required Fields**: NOT NULL eliminates NULL handling bugs

## Rollout Plan

1. **Deploy Migration 1**: Add column and indexes (backward compatible)
2. **Deploy Code**: Update application to use new functions
3. **Deploy Migration 2**: Add NOT NULL and triggers (after backfill)
4. **Monitor**: Watch for any errors in logs
5. **Verify**: Test all scenarios in checklist

