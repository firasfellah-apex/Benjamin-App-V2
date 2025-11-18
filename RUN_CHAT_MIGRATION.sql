-- ============================================================================
-- Complete Chat Feature Migration
-- ============================================================================
-- This creates the messages table AND fixes the RLS policy to match frontend logic
-- Run this entire file in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'runner', 'admin')),
  body text NOT NULL CHECK (trim(body) != ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_order_id_created_at ON messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Add RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for orders they're involved in
-- Drop if exists first (PostgreSQL doesn't support IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Users can view messages for their orders" ON messages;

CREATE POLICY "Users can view messages for their orders"
  ON messages
  FOR SELECT
  USING (
    -- Customer can see messages for their orders
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND orders.customer_id = auth.uid()
    )
    OR
    -- Runner can see messages for orders they're assigned to
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND orders.runner_id = auth.uid()
    )
    OR
    -- Admin can see all messages
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'admin' = ANY(profiles.role)
    )
  );

-- ============================================================================
-- STEP 2: Create INSERT Policy (Fixed to match frontend logic)
-- ============================================================================
-- Drop old policy if it exists
DROP POLICY IF EXISTS "Users can send messages for their active orders" ON messages;

-- Create new INSERT policy that matches frontend canSendMessage() logic
-- Only allows sending for 'Cash Withdrawn' and 'Pending Handoff' statuses
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

-- Policy: No updates or deletes (messages are immutable)
DROP POLICY IF EXISTS "Messages are immutable" ON messages;
CREATE POLICY "Messages are immutable"
  ON messages
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Messages cannot be deleted" ON messages;
CREATE POLICY "Messages cannot be deleted"
  ON messages
  FOR DELETE
  USING (false);

-- Add comment
COMMENT ON TABLE messages IS 'Per-order chat messages between customers, runners, and admins. Chat is enabled only for Cash Withdrawn and Pending Handoff statuses.';

-- ============================================================================
-- STEP 3: Enable Realtime for Messages Table
-- ============================================================================
-- Note: This may fail if Realtime extension is not enabled
-- If it fails, enable Realtime in Dashboard → Database → Replication → messages
DO $$
BEGIN
  -- Try to add to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add messages to realtime publication. Enable manually in Dashboard → Database → Replication → messages';
END $$;

-- ============================================================================
-- Verification Query (run this after to confirm it worked)
-- ============================================================================
-- Uncomment the line below to verify:
-- SELECT '✅ Messages table created successfully!' AS status;

