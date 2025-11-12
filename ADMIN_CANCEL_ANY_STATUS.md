# Allow Admin to Cancel Orders from Any Status

## Overview
This update allows administrators to cancel orders from any status (except Completed), including orders that have already passed the withdrawal stage (Cash Withdrawn, Pending Handoff).

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20251111_allow_admin_cancel_any_status.sql`

**Changes:**
- Added cancellation transitions to the transition table for audit trail completeness:
  - `Runner at ATM` → `Cancelled`
  - `Cash Withdrawn` → `Cancelled`
  - `Pending Handoff` → `Cancelled`
- Modified `rpc_advance_order` function to:
  - Check if user is admin **before** checking transition table
  - Allow admin to bypass transition table check for cancellation
  - Only block cancellation if order is already `Completed`
  - Properly record admin override in audit trail metadata

### 2. Frontend Updates
**File:** `src/db/api.ts`
- Updated `cancelOrder` function comments to clarify admin can cancel from any status
- Removed restrictive status checks (only blocks Completed/Cancelled)

**File:** `src/pages/admin/AdminOrderDetail.tsx`
- Cancel button already shows for all non-completed, non-cancelled orders
- No changes needed - UI already supports this

## How It Works

### Before
- FSM transition table only allowed:
  - `Pending` → `Cancelled`
  - `Runner Accepted` → `Cancelled`
- Orders past withdrawal could not be cancelled

### After
- Admins can cancel from **any status** except `Completed`
- Transition table check is bypassed for admin cancellations
- All cancellation transitions are recorded in the transition table for audit trail
- Audit trail includes `admin_override: true` in metadata

## Database Migration

Run this migration in your Supabase SQL editor:

```sql
-- See: supabase/migrations/20251111_allow_admin_cancel_any_status.sql
```

Or apply it via Supabase CLI:
```bash
supabase migration up
```

## Testing

1. **Test Cancellation from Different Statuses:**
   - Create a test order
   - Cancel it at different stages:
     - `Pending`
     - `Runner Accepted`
     - `Runner at ATM`
     - `Cash Withdrawn`
     - `Pending Handoff`
   - Verify all succeed (except `Completed`)

2. **Verify Audit Trail:**
   - Check `order_events` table
   - Confirm `admin_override: true` in metadata for admin cancellations
   - Verify `cancelled_by` and `cancellation_reason` are set

3. **Verify UI:**
   - Cancel button appears for all non-completed, non-cancelled orders
   - Cancellation dialog works from any status
   - Success message displays correctly

## Security

- Only users with `admin` role can bypass transition table
- All cancellations are logged in audit trail
- `admin_override` flag in metadata indicates admin action
- Completed orders cannot be cancelled (business rule)

## Rollback

If you need to rollback:
1. Revert the FSM function to previous version
2. Remove the additional cancellation transitions from transition table
3. Re-deploy previous migration

## Notes

- This is an **admin-only** feature
- Customers and runners still follow normal FSM rules
- Completed orders cannot be cancelled (by design)
- All cancellations are fully audited

