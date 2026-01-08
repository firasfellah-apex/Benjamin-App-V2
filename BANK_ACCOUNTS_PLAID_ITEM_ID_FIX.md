# 🔧 Bank Accounts: plaid_item_id NOT NULL Fix

## Issue

The `bank_accounts` table has `plaid_item_id text NOT NULL`, so any insert without it will fail.

## Current Status

### ✅ Plaid Edge Function (Already Fixed)

The Plaid Edge Function (`supabase/functions/plaid/index.ts`) **already includes** `plaid_item_id`:

```typescript
const bankAccountData: any = {
  user_id: user.id,
  plaid_item_id: itemId, // ✅ Already included
  kyc_status: "verified",
  kyc_verified_at: new Date().toISOString(),
  is_primary: isFirstBank,
  updated_at: new Date().toISOString(),
};

// ... then upsert
const { error: bankAccountError, data: bankAccountResult } = await supabase
  .from("bank_accounts")
  .upsert(bankAccountData, {
    onConflict: 'user_id,plaid_item_id',
    ignoreDuplicates: false,
  })
  .select();
```

**This is correct!** ✅

## If You're Still Seeing Errors

### Check 1: Verify itemId is Available

The `itemId` comes from Plaid's exchange process. Verify it's being passed correctly:

```typescript
// In Plaid Edge Function, check:
console.log("[Plaid] itemId received:", itemId);
console.log("[Plaid] bankAccountData:", JSON.stringify(bankAccountData, null, 2));
```

### Check 2: Verify Error Details

If insert is still failing, check the full error:

```typescript
if (bankAccountError) {
  console.error("[Plaid] ❌ Bank account insert error:", {
    code: bankAccountError.code,
    message: bankAccountError.message,
    details: bankAccountError.details,
    hint: bankAccountError.hint,
    fullError: JSON.stringify(bankAccountError, null, 2),
  });
}
```

Common error codes:
- `23502` = NOT NULL violation (plaid_item_id is missing)
- `42501` = Permission denied (RLS policy issue)
- `23505` = Unique constraint violation

### Check 3: Verify Table Schema

Run in Supabase SQL Editor:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
  AND column_name = 'plaid_item_id';
```

Should show:
- `is_nullable = NO` (NOT NULL)
- `data_type = text`

## Alternative Fix: Make plaid_item_id Nullable

**Only do this if you truly support non-Plaid bank accounts!**

If you want to allow bank accounts without Plaid (e.g., manual entry), make it nullable:

```sql
-- Make plaid_item_id nullable
ALTER TABLE public.bank_accounts
  ALTER COLUMN plaid_item_id DROP NOT NULL;

-- Update unique constraint to handle NULLs
-- PostgreSQL allows multiple NULLs in unique constraints
-- But you might want to adjust the constraint:
ALTER TABLE public.bank_accounts
  DROP CONSTRAINT IF EXISTS bank_accounts_user_id_plaid_item_id_key;

-- Recreate with NULL handling
ALTER TABLE public.bank_accounts
  ADD CONSTRAINT bank_accounts_user_id_plaid_item_id_key
  UNIQUE (user_id, plaid_item_id);
```

**Note**: PostgreSQL's UNIQUE constraint allows multiple NULLs, so this works. But if you have multiple NULL `plaid_item_id` values for the same user, they'll all be allowed.

## Recommended Approach

**Keep `plaid_item_id NOT NULL`** and ensure all inserts include it:

1. ✅ Plaid Edge Function already includes it (correct)
2. ✅ Verify `itemId` is available when calling the function
3. ✅ Add error logging to catch any missing values
4. ❌ Don't make it nullable unless you truly need non-Plaid accounts

## Verification

After a Plaid Link flow completes, check:

```sql
SELECT 
  id,
  user_id,
  plaid_item_id,
  bank_institution_name,
  is_primary,
  created_at
FROM bank_accounts
ORDER BY created_at DESC
LIMIT 5;
```

All rows should have a non-NULL `plaid_item_id`.

## Debugging Steps

1. **Check Plaid Edge Function logs**:
   - Look for `[Plaid] itemId received: ...`
   - Look for `[Plaid] bankAccountData: ...`
   - Verify `plaid_item_id` is in the data

2. **Check error details**:
   - If error code is `23502`, `plaid_item_id` is missing
   - If error code is `42501`, RLS policy is blocking
   - If error code is `23505`, unique constraint violation

3. **Verify table exists**:
   - Check if `bank_accounts` table exists
   - Check if migration `20250129_create_bank_accounts_table.sql` ran

4. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'bank_accounts';
   ```

## Summary

- ✅ **Plaid function already includes `plaid_item_id`** - No code changes needed
- ⚠️ **If errors persist**: Check error details, verify `itemId` is available
- 🔧 **Optional**: Make nullable only if you support non-Plaid accounts

The current implementation is correct. If you're seeing errors, they're likely due to:
1. `itemId` not being available in the Plaid exchange response
2. RLS policy blocking the insert
3. Table not existing (migration not run)

Check the error details to pinpoint the exact issue! 🔍

