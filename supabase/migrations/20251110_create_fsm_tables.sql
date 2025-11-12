-- Create FSM tables required for rpc_advance_order function
-- This creates the order_status_transitions and order_events tables

-- ============================================================================
-- 1. Create order_status_transitions table (allowlist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_status_transitions (
  from_status order_status NOT NULL,
  to_status order_status NOT NULL,
  description text,
  PRIMARY KEY (from_status, to_status)
);

-- Insert valid transitions
INSERT INTO order_status_transitions (from_status, to_status, description) VALUES
  ('Pending', 'Runner Accepted', 'Runner accepts the delivery job'),
  ('Runner Accepted', 'Runner at ATM', 'Runner arrives at ATM location'),
  ('Runner at ATM', 'Cash Withdrawn', 'Runner withdraws cash from ATM'),
  ('Cash Withdrawn', 'Pending Handoff', 'OTP generated, ready for handoff'),
  ('Pending Handoff', 'Completed', 'OTP verified, delivery completed'),
  ('Pending', 'Cancelled', 'Customer cancels before runner arrives at ATM'),
  ('Runner Accepted', 'Cancelled', 'Order cancelled after acceptance')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- ============================================================================
-- 2. Create order_events table (audit trail + idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  actor_role user_role,
  client_action_id text, -- Idempotency key
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  
  -- Idempotency: prevent duplicate transitions with same client_action_id
  UNIQUE (order_id, client_action_id)
);

-- Index for querying order history
CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON order_events (order_id, created_at DESC);

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS order_events_client_action_id_idx ON order_events (client_action_id) WHERE client_action_id IS NOT NULL;

-- Enable RLS on order_events
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all events
CREATE POLICY "Admins can view all order events" ON order_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND 'admin' = ANY(role)
    )
  );

-- RLS Policy: Users can view events for their own orders
CREATE POLICY "Users can view events for own orders" ON order_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
        AND (orders.customer_id = auth.uid() OR orders.runner_id = auth.uid())
    )
  );

-- RLS Policy: System can insert events (via RPC function)
CREATE POLICY "System can insert order events" ON order_events
  FOR INSERT TO authenticated WITH CHECK (true);

