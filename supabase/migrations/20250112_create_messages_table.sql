-- ============================================================================
-- Create Messages Table for Per-Order Chat
-- ============================================================================
-- Purpose: Enable per-order messaging between customers, runners, and admins
-- Security: RLS policies ensure users can only see messages for orders they're involved in
-- Behavior: Chat is enabled only for active orders (disabled for completed/cancelled)

-- Create messages table
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

-- Policy: Users can send messages for active orders they're involved in
CREATE POLICY "Users can send messages for their active orders"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- Customer can send messages for their orders (when active)
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = messages.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status NOT IN ('Completed', 'Cancelled')
      )
      OR
      -- Runner can send messages for orders they're assigned to (when active)
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = messages.order_id
        AND orders.runner_id = auth.uid()
        AND orders.status NOT IN ('Completed', 'Cancelled')
      )
      OR
      -- Admin can send messages for any active order
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND 'admin' = ANY(profiles.role)
        AND EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = messages.order_id
          AND orders.status NOT IN ('Completed', 'Cancelled')
        )
      )
    )
  );

-- Policy: No updates or deletes (messages are immutable)
CREATE POLICY "Messages are immutable"
  ON messages
  FOR UPDATE
  USING (false);

CREATE POLICY "Messages cannot be deleted"
  ON messages
  FOR DELETE
  USING (false);

-- Add comment
COMMENT ON TABLE messages IS 'Per-order chat messages between customers, runners, and admins. Chat is disabled for completed/cancelled orders.';

-- Enable realtime for messages table
-- This allows instant message updates across all connected clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

