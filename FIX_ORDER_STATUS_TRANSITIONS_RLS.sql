-- Quick fix: Enable RLS on order_status_transitions table
-- Run this in Supabase SQL Editor to resolve the security alert immediately

-- Enable Row Level Security
ALTER TABLE order_status_transitions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all transitions
-- This is needed for the frontend to query valid next statuses
CREATE POLICY "Authenticated users can read order status transitions"
  ON order_status_transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'order_status_transitions';

-- Verify policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'order_status_transitions';

