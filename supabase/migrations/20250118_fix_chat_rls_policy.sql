-- ============================================================================
-- Fix Chat RLS Policy to Match Frontend Logic
-- ============================================================================
-- Issue: RLS policy allows sending for any status except Completed/Cancelled,
-- but frontend canSendMessage() only allows 'Cash Withdrawn' and 'Pending Handoff'
-- This mismatch can cause chat to not work properly.
--
-- Fix: Update RLS policy to only allow sending for 'Cash Withdrawn' and 'Pending Handoff'

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Users can send messages for their active orders" ON messages;

-- Create new INSERT policy that matches frontend logic
CREATE POLICY "Users can send messages for their active orders"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- Customer can send messages for their orders (only when Cash Withdrawn or Pending Handoff)
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = messages.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status IN ('Cash Withdrawn', 'Pending Handoff')
      )
      OR
      -- Runner can send messages for orders they're assigned to (only when Cash Withdrawn or Pending Handoff)
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = messages.order_id
        AND orders.runner_id = auth.uid()
        AND orders.status IN ('Cash Withdrawn', 'Pending Handoff')
      )
      OR
      -- Admin can send messages for any active order (only when Cash Withdrawn or Pending Handoff)
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND 'admin' = ANY(profiles.role)
        AND EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = messages.order_id
          AND orders.status IN ('Cash Withdrawn', 'Pending Handoff')
        )
      )
    )
  );

