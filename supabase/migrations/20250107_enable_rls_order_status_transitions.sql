-- Enable RLS on order_status_transitions table
-- This is a read-only reference table that stores valid order status transitions
-- All authenticated users need read access to query valid transitions

-- Enable Row Level Security
ALTER TABLE order_status_transitions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all transitions
-- This is needed for the frontend to query valid next statuses
CREATE POLICY "Authenticated users can read order status transitions"
  ON order_status_transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT/UPDATE/DELETE policies needed
-- This table is managed via migrations only, not through the API
-- Only database migrations should modify this reference data

