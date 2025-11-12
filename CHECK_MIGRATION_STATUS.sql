-- Check if the admin cancel migration has been applied
-- Run this in your Supabase SQL Editor to verify the migration status

-- 1. Check if the cancellation transitions exist in the transition table
SELECT 
  from_status,
  to_status,
  description
FROM order_status_transitions
WHERE to_status = 'Cancelled'
ORDER BY from_status;

-- 2. Check the current rpc_advance_order function definition
-- This will show if the admin bypass logic is present
SELECT 
  prosrc
FROM pg_proc
WHERE proname = 'rpc_advance_order';

-- 3. Check if admin can cancel from Cash Withdrawn status
-- (This should return a row if the migration was applied)
SELECT 
  from_status,
  to_status
FROM order_status_transitions
WHERE from_status = 'Cash Withdrawn' 
  AND to_status = 'Cancelled';

-- 4. Check if admin can cancel from Pending Handoff status
SELECT 
  from_status,
  to_status
FROM order_status_transitions
WHERE from_status = 'Pending Handoff' 
  AND to_status = 'Cancelled';

-- Expected results after migration:
-- - Should see transitions: Runner at ATM → Cancelled, Cash Withdrawn → Cancelled, Pending Handoff → Cancelled
-- - Function should contain logic checking v_is_admin before transition table validation

