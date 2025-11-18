-- ============================================================================
-- Allow Runners to View Customer Profiles for Assigned Orders
-- ============================================================================
-- Purpose: Enable runners to view customer profiles (including avatars) for orders they're assigned to
-- This is needed for chat avatars and order details
-- Security: Only for orders where runner_id = auth.uid()
--
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Runners can view customer profiles for assigned orders" ON profiles;

-- Create policy: Runners can view customer profiles for orders they're assigned to
CREATE POLICY "Runners can view customer profiles for assigned orders"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User must be a runner
    has_role(auth.uid(), 'runner'::user_role)
    AND
    -- Customer profile must be associated with an order assigned to this runner
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.customer_id = profiles.id
      AND orders.runner_id = auth.uid()
      AND orders.status IN (
        'Runner Accepted',
        'Runner at ATM',
        'Cash Withdrawn',
        'Pending Handoff',
        'Completed'
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Runners can view customer profiles for assigned orders" ON profiles IS 
  'Allows runners to view customer profiles (including avatars) for orders they are assigned to, enabling chat avatars and order details';

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Customers can view runner profiles for their orders" ON profiles;

-- Create policy: Customers can view runner profiles for their own orders
CREATE POLICY "Customers can view runner profiles for their orders"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User must be a customer
    has_role(auth.uid(), 'customer'::user_role)
    AND
    -- Runner profile must be associated with an order owned by this customer
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.runner_id = profiles.id
      AND orders.customer_id = auth.uid()
      AND orders.status IN (
        'Runner Accepted',
        'Runner at ATM',
        'Cash Withdrawn',
        'Pending Handoff',
        'Completed'
      )
    )
  );

-- Add comment
COMMENT ON POLICY "Customers can view runner profiles for their orders" ON profiles IS 
  'Allows customers to view runner profiles (including avatars) for their own orders, enabling chat avatars and order details';

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname IN (
  'Runners can view customer profiles for assigned orders',
  'Customers can view runner profiles for their orders'
);

