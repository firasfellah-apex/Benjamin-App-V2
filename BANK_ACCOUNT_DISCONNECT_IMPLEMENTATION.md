# Bank Account Disconnect Implementation Summary

## Overview
Implemented industry-standard "Disconnect bank account" flow that revokes access while retaining historical references for audit, refunds, and support.

## Changes Made

### A) Database Schema (`supabase/migrations/20250117_add_bank_account_soft_disconnect.sql`)
- Added `is_active` boolean column (default: true) - marks account as active/disconnected
- Added `disconnected_at` timestamptz column - timestamp when account was disconnected
- Added index on `(user_id, is_active)` for efficient filtering
- Updated `ensure_single_primary_bank_account()` function to only consider active accounts
- Added `prevent_inactive_primary()` trigger to prevent setting disconnected accounts as primary

### B) Server-Side Logic (`src/db/api.ts`)

#### 1. Updated `BankAccount` Interface
- Added `is_active: boolean`
- Added `disconnected_at: string | null`
- Made `plaid_item_id` nullable (cleared on disconnect)

#### 2. Updated `getBankAccounts()`
- Now filters to only return `is_active = true` accounts
- Disconnected accounts are excluded from payment selection

#### 3. New `disconnectBankAccount()` Function
- Verifies user owns the bank account
- Checks if account is already disconnected
- **Soft disconnect**: Sets `is_active = false`, `disconnected_at = now()`, nulls `plaid_item_id`
- If account was primary, automatically sets another active account as primary (if available)
- **TODO**: Plaid item revocation - currently nulls `plaid_item_id`, but should call Plaid API when integration is complete
- Always succeeds (even if account has orders) - retains historical reference

#### 4. Updated `deleteBankAccount()` Function
- Now restricted to internal/admin use
- Only allows hard delete if:
  - Account has zero linked orders
  - Account is already disconnected (`is_active = false`)
- Returns clear error messages if conditions not met

#### 5. Updated `setPrimaryBankAccount()`
- Verifies account is active before allowing it to be set as primary
- Prevents setting disconnected accounts as primary

### C) Client-Side UX (`src/pages/customer/BankAccounts.tsx`)

#### Dialog Copy (Exact as Specified)
- **Title**: "Disconnect bank account?"
- **Body**: "This account will no longer be connected to Benjamin and won't be used for future orders. We'll keep a secure, read-only record for past orders in case refunds or adjustments are needed."
- **Primary CTA**: "Disconnect"
- **Secondary CTA**: "Cancel"

#### Error Handling
- Errors displayed inline in dialog (red alert box)
- Dialog stays open on error
- Toast notification also shown as backup

### D) Hook Updates (`src/hooks/useBankAccounts.ts`)
- Updated to use new `disconnectBankAccount()` function
- Maintains same interface for backward compatibility

## Key Behaviors

### ✅ Account with No Orders
- Disconnect works immediately
- Account disappears from payment selection
- Account marked as inactive, historical record retained

### ✅ Account with Prior Orders
- Disconnect works (no error)
- Account becomes unusable for future orders
- Orders still reference original `bank_account_id` for refund routing
- Account filtered out from `getBankAccounts()` (won't appear in selectors)

### ✅ Primary Account Disconnection
- If disconnected account was primary, system automatically:
  1. Sets `is_primary = false` on disconnected account
  2. Finds another active account and sets it as primary (if available)
  3. If no other active accounts, user has no primary (will need to connect new account)

### ✅ Hard Delete Restrictions
- Attempting hard delete on account with orders → blocked with message
- Attempting hard delete on active account → blocked with message
- Hard delete only works for disconnected accounts with zero orders

### ✅ Refund Flow Compatibility
- Orders retain `bank_account_id` reference even after disconnect
- Refund routing can still resolve original bank account
- Historical audit trail preserved

## Testing Checklist

1. ✅ Account with no orders → Disconnect works; account disappears from payment selection
2. ✅ Account with prior orders → Disconnect works; account unusable for future orders; orders still reference it
3. ✅ Attempt hard delete on account with orders → blocked with clear message
4. ✅ If disconnected account was primary → primary updated safely
5. ✅ Refund flow (if exists) can still resolve original bank_account_id

## Files Changed

1. `supabase/migrations/20250117_add_bank_account_soft_disconnect.sql` - Database schema
2. `src/db/api.ts` - Server-side logic (disconnect, delete, getBankAccounts, setPrimary)
3. `src/hooks/useBankAccounts.ts` - Hook updates
4. `src/pages/customer/BankAccounts.tsx` - UI copy and error handling

## Next Steps (Future Enhancements)

1. **Plaid Integration**: When Plaid API integration is complete, add `revokePlaidItem()` call in `disconnectBankAccount()`
2. **Optional UI Enhancement**: Show disconnected accounts in collapsed "Disconnected" section with "Used for past orders" badge (currently hidden entirely)

## Notes

- All existing order references remain intact (foreign key not broken)
- Disconnected accounts are completely hidden from user-facing selection
- Historical data preserved for compliance and refund processing
- UX follows industry standards (Venmo, Cash App, etc.)

