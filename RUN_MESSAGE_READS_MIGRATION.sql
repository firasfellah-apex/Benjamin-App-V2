-- ============================================================================
-- Add Message Read Tracking - Complete Migration
-- ============================================================================
-- Run this entire script to create the message_reads table and enable realtime

-- Create message_reads table to track read status
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_message ON message_reads(user_id, message_id);

-- Enable RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own read receipts
DROP POLICY IF EXISTS "Users can view their own read receipts" ON message_reads;
CREATE POLICY "Users can view their own read receipts"
  ON message_reads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can mark messages as read for orders they're involved in
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read"
  ON message_reads
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- User can mark messages as read if they're involved in the order
      EXISTS (
        SELECT 1 FROM messages
        JOIN orders ON orders.id = messages.order_id
        WHERE messages.id = message_reads.message_id
        AND (
          orders.customer_id = auth.uid()
          OR orders.runner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND 'admin' = ANY(profiles.role)
          )
        )
      )
    )
  );

-- Add comment
COMMENT ON TABLE message_reads IS 'Tracks which messages have been read by which users for unread count calculations';

-- Enable realtime for message_reads table
-- This allows instant updates when messages are marked as read
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

-- Verify the table was created
SELECT 
  'message_reads table created successfully' as status,
  COUNT(*) as row_count
FROM message_reads;

