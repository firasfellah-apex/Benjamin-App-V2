# 🚨 URGENT: Run Migration to Enable Admin Order Cancellation

## The Problem
You're getting a 400 error when trying to cancel orders past the withdrawal stage because **the migration hasn't been applied yet**.

## Quick Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Migration
Copy and paste the **entire contents** of `supabase/migrations/20251111_allow_admin_cancel_any_status.sql` into the SQL Editor and click "Run".

### Step 3: Verify It Worked
Run this query to verify the migration was applied:

```sql
-- Check if admin can cancel from Cash Withdrawn status
SELECT 
  from_status,
  to_status,
  description
FROM order_status_transitions
WHERE to_status = 'Cancelled'
ORDER BY from_status;
```

You should see:
- `Pending` → `Cancelled`
- `Runner Accepted` → `Cancelled`
- `Runner at ATM` → `Cancelled` ✅ (NEW)
- `Cash Withdrawn` → `Cancelled` ✅ (NEW)
- `Pending Handoff` → `Cancelled` ✅ (NEW)

### Step 4: Test
1. Refresh your app
2. Try to cancel an order that's past withdrawal
3. It should work now!

## Alternative: Check Migration Status First

If you want to verify the current state first, run `CHECK_MIGRATION_STATUS.sql` to see what's currently in your database.

## Why This Happened

The migration file was created but **not applied to your Supabase database**. The FSM function is still using the old logic that only allows cancellation from `Pending` and `Runner Accepted` statuses.

## Need Help?

If you're still getting errors after running the migration:
1. Check the browser console for the detailed error message (I've improved error logging)
2. Verify your user has the `admin` role in the `profiles` table
3. Make sure the migration ran successfully (no errors in Supabase SQL Editor)









