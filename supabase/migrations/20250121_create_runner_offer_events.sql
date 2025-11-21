-- ============================================================================
-- Create runner_offer_events table
-- ============================================================================
-- Purpose: Track when runners receive, accept, skip, or timeout on order offers
-- This enables showing skipped orders in runner history

CREATE TABLE IF NOT EXISTS runner_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('received', 'accepted', 'skipped', 'timeout')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_runner_offer_events_runner_id ON runner_offer_events(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_offer_events_offer_id ON runner_offer_events(offer_id);
CREATE INDEX IF NOT EXISTS idx_runner_offer_events_event ON runner_offer_events(event);
CREATE INDEX IF NOT EXISTS idx_runner_offer_events_created_at ON runner_offer_events(created_at DESC);

-- Enable RLS
ALTER TABLE runner_offer_events ENABLE ROW LEVEL SECURITY;

-- Policy: Runners can view their own offer events
DROP POLICY IF EXISTS "Runners can view their own offer events" ON runner_offer_events;

CREATE POLICY "Runners can view their own offer events"
  ON runner_offer_events
  FOR SELECT
  USING (auth.uid() = runner_id);

-- Policy: Runners can insert their own offer events
DROP POLICY IF EXISTS "Runners can insert their own offer events" ON runner_offer_events;

CREATE POLICY "Runners can insert their own offer events"
  ON runner_offer_events
  FOR INSERT
  WITH CHECK (auth.uid() = runner_id);

-- Add comment
COMMENT ON TABLE runner_offer_events IS 'Tracks runner interactions with order offers (received, accepted, skipped, timeout)';

-- Enable realtime for runner_offer_events table
-- This allows instant updates when orders are skipped
ALTER PUBLICATION supabase_realtime ADD TABLE public.runner_offer_events;

