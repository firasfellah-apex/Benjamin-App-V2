-- ============================================================================
-- Allow Runners to View Customer Profiles for Assigned Orders
-- ============================================================================
-- Purpose: Enable runners to view customer profiles (including avatars) for orders they're assigned to
-- This is needed for chat avatars and order details
-- Security: Only for orders where runner_id = auth.uid()

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

