-- ============================================================================
-- Verify otp_verified_at Column Exists
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the column was added successfully

-- Check if column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'otp_verified_at';

-- Expected Result:
-- column_name      | data_type  | is_nullable | column_default
-- otp_verified_at  | timestamp with time zone | YES | NULL

-- If you see the row above, the column exists and is ready to use!

-- ============================================================================
-- Test Update (Optional - for debugging)
-- ============================================================================
-- Uncomment the lines below to test updating otp_verified_at on a test order
-- Replace 'YOUR_ORDER_ID' with an actual order ID

-- UPDATE orders 
-- SET otp_verified_at = NOW()
-- WHERE id = 'YOUR_ORDER_ID'
-- RETURNING id, otp_verified_at;

