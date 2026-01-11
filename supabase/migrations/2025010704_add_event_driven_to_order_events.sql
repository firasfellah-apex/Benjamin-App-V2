-- Add event-driven columns to order_events table
-- This enables both FSM transitions AND simple event-driven notifications

-- Add event_type column (nullable, for backward compatibility)
ALTER TABLE public.order_events
  ADD COLUMN IF NOT EXISTS event_type text;

-- Add payload column (nullable, for backward compatibility)
ALTER TABLE public.order_events
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

-- Index for event_type queries (for notification routing)
CREATE INDEX IF NOT EXISTS order_events_event_type_idx 
  ON public.order_events (event_type, created_at DESC) 
  WHERE event_type IS NOT NULL;

-- Index for order_id + event_type (common query pattern)
CREATE INDEX IF NOT EXISTS order_events_order_id_event_type_idx 
  ON public.order_events (order_id, event_type, created_at DESC) 
  WHERE event_type IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.order_events.event_type IS 'Event type for push notifications (e.g., order_created, runner_assigned). If NULL, this is an FSM transition event.';
COMMENT ON COLUMN public.order_events.payload IS 'Event payload for push notifications. Contains event-specific data (e.g., runner_id, eta_seconds).';

