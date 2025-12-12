# Session Summary: Multiple Bank Accounts Feature

## Main Goal
Enable users to connect and manage multiple bank accounts simultaneously, replacing the previous single-bank limitation where connecting a new bank would replace the old one.

## Problem Identified
- Users could only have ONE bank account stored in the `profiles` table
- Connecting a new bank would overwrite the previous one
- No way to see or manage multiple banks

## Solution Implemented

### 1. Database Migration
**File:** `supabase/migrations/20250129_create_bank_accounts_table.sql`

- Created new `bank_accounts` table with:
  - `id` (uuid, primary key)
  - `user_id` (references profiles)
  - `plaid_item_id` (unique per user)
  - `bank_institution_name`
  - `bank_institution_logo_url`
  - `bank_last4`
  - `is_primary` (boolean, one primary per user)
  - `kyc_status`, `kyc_verified_at`
  - `created_at`, `updated_at`
- Added RLS policies for SELECT, INSERT, UPDATE, DELETE
- Added unique constraint on `(user_id, plaid_item_id)`
- Added trigger to ensure only one primary account per user
- Added indexes for performance

**IMPORTANT:** This migration must be run in Supabase SQL Editor before the feature works.

### 2. Plaid Edge Function Updates
**File:** `supabase/functions/plaid/index.ts`

**Key Changes:**
- **Automatic Legacy Migration:** When a new bank is connected and `bank_accounts` table is empty, automatically migrates existing bank from `profiles` table to `bank_accounts` table
- **Insert into bank_accounts:** Changed from updating `profiles` table to inserting into `bank_accounts` table
- **Enhanced Logging:** Added comprehensive logging for:
  - Existing banks check
  - Legacy bank migration
  - Bank account insertion
  - Total banks after operations
- **Fallback Logic:** Still supports fallback to `profiles` table if `bank_accounts` table doesn't exist (with warnings)
- **Profile Query:** Updated to fetch bank fields (`plaid_item_id`, `bank_institution_name`, `bank_institution_logo_url`, `kyc_verified_at`) for migration logic

**Critical Code Pattern:**
```typescript
// Check existing banks
let { data: existingBanks, error: checkError } = await supabase
  .from("bank_accounts")
  .select("id, plaid_item_id, bank_institution_name")
  .eq("user_id", user.id);

// Migrate legacy bank if needed
if ((!existingBanks || existingBanks.length === 0) && profile.plaid_item_id) {
  // Migrate from profiles to bank_accounts
}

// Insert new bank
await supabase
  .from("bank_accounts")
  .upsert(bankAccountData, {
    onConflict: 'user_id,plaid_item_id',
    ignoreDuplicates: false,
  });
```

### 3. Frontend Changes

**New Hook:** `src/hooks/useBankAccounts.ts`
- Fetches all bank accounts for the current user
- Returns `bankAccounts` array, `hasAnyBank` boolean, and loading states
- Handles fallback to `profiles` table if `bank_accounts` doesn't exist
- Includes legacy bank account format conversion

**Updated Files:**
- `src/pages/customer/BankAccounts.tsx`:
  - Uses `useBankAccounts()` hook instead of profile data
  - Maps over `bankAccounts` array to display all banks
  - Each bank shown in a `CustomerCard` component
  - "Add Bank Account" button when banks exist
  - "Connect Bank with Plaid" button when no banks
  - Disconnect functionality for individual banks

- `src/hooks/usePlaidLinkKyc.ts`:
  - Added cache invalidation for `bank-accounts` query after successful connection
  - Waits for Edge Function to complete before refetching
  - Ensures UI updates immediately after bank connection

- `src/db/api.ts`:
  - Added `getBankAccounts()` function
  - Added `deleteBankAccount()` function
  - Handles fallback to `profiles` table gracefully
  - Returns legacy format if table doesn't exist

### 4. Cache Management
- `usePlaidLinkKyc` invalidates both `profile` and `bank-accounts` queries
- `useBankAccounts` has `staleTime: 0` for fresh fetches
- Added `refetchOnWindowFocus`, `refetchOnMount`, `refetchOnReconnect`
- Proper cache invalidation after bank disconnect

## Migration Requirements

### Step 1: Run Database Migration
**File:** `supabase/migrations/20250129_create_bank_accounts_table.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy ALL SQL content from the migration file
3. Paste and run in SQL Editor
4. Verify with: `SELECT table_name FROM information_schema.tables WHERE table_name = 'bank_accounts';`

### Step 2: Redeploy Edge Function
**Critical:** The Edge Function code must be redeployed for the feature to work.

```bash
supabase functions deploy plaid
```

Or use Supabase Dashboard → Edge Functions → Redeploy

## Important Notes

### Edge Function Behavior
- **First bank connection:** Migrates legacy bank from `profiles` (if exists), then adds new bank
- **Subsequent connections:** Adds new bank alongside existing ones
- **Same Plaid item:** Updates existing bank account (upsert behavior)
- **Fallback mode:** If `bank_accounts` table doesn't exist, falls back to `profiles` table (single bank only)

### Data Migration
- Legacy banks in `profiles` table are automatically migrated when user connects a new bank
- Migration happens transparently - no user action required
- Old bank data is preserved during migration
- Both old and new banks appear in the list after migration

### Frontend Behavior
- Displays all banks from `bank_accounts` table
- Falls back to `profiles` table if `bank_accounts` doesn't exist (shows as single "legacy" bank)
- Each bank can be disconnected individually
- "Add Bank Account" button appears when at least one bank exists
- Empty state shows when no banks are connected

### Testing Checklist
- [ ] Migration applied successfully
- [ ] Edge Function redeployed
- [ ] Can connect first bank (migrates legacy if exists)
- [ ] Can connect second bank (both show in list)
- [ ] Can disconnect individual banks
- [ ] Can reconnect disconnected banks
- [ ] UI updates immediately after connection/disconnect

## Files Changed

### New Files
- `supabase/migrations/20250129_create_bank_accounts_table.sql`
- `src/hooks/useBankAccounts.ts`
- Various documentation/verification SQL files

### Modified Files
- `supabase/functions/plaid/index.ts` (major changes)
- `src/pages/customer/BankAccounts.tsx` (major changes)
- `src/hooks/usePlaidLinkKyc.ts` (cache invalidation)
- `src/db/api.ts` (new functions)
- `src/types/types.ts` (type updates)

## Debugging

### Check if Migration Applied
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'bank_accounts';
```

### Check Bank Accounts
```sql
SELECT id, user_id, plaid_item_id, bank_institution_name, is_primary 
FROM bank_accounts 
WHERE user_id = 'your-user-id';
```

### Edge Function Logs to Look For
- `[Plaid] Found existing bank accounts: { count: X }`
- `[Plaid] 🔄 Migrating legacy bank from profiles table`
- `[Plaid] ✅ Successfully migrated legacy bank`
- `[Plaid] 📊 Total bank accounts for user after insert: { total_count: X }`

### Frontend Logs to Look For
- `[getBankAccounts] Query result from bank_accounts table: X`
- `[BankAccounts] Bank accounts state: { bankAccountsCount: X }`
- `[Plaid] ✅ Invalidated both profile and bank-accounts caches`

## Known Issues & Solutions

### Issue: Only seeing one bank
**Cause:** Edge Function not redeployed or migration not applied
**Solution:** 
1. Verify migration applied: Check `bank_accounts` table exists
2. Redeploy Edge Function
3. Check Edge Function logs for migration messages

### Issue: Old bank disappears when adding new one
**Cause:** Migration logic not running (Edge Function not redeployed)
**Solution:** Redeploy Edge Function - migration happens automatically on next bank connection

### Issue: Frontend shows "legacy" bank
**Cause:** `bank_accounts` table doesn't exist, falling back to `profiles`
**Solution:** Run the migration

## Next Steps (Future Enhancements)
- Add ability to set primary bank
- Add bank account verification status per bank
- Add bank account last synced timestamp
- Add ability to reorder banks
- Add bank account metadata (account type, etc.)

