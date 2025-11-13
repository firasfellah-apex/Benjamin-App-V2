/*
# Enable Realtime for order_events Table

## Purpose
Enable Supabase Realtime for the `order_events` table to allow instant updates when runners mark arrival.
This enables customers to see "Arrived" status immediately when the runner clicks "I've arrived at the location".

## Changes
1. **Replica Identity**: Set to FULL so INSERT events include all column values
2. **Realtime Publication**: Add order_events table to supabase_realtime publication

## Why This Matters
- Without replica identity FULL, INSERT events may not include all column values
- Without being in the publication, no realtime events are emitted at all
- This enables instant arrival status updates without polling

## Security
- Realtime respects existing RLS policies
- Users only receive events for rows they can SELECT
- No additional security configuration needed

## Testing
After applying this migration:
1. Enable Realtime in Supabase Dashboard → Database → Replication → order_events
2. Have a runner accept an order and mark arrival
3. Customer should see "Arrived" status immediately in their app
*/

-- Enable full replica identity for order_events table
-- This ensures INSERT events include all column values
ALTER TABLE public.order_events REPLICA IDENTITY FULL;

-- Add order_events table to the realtime publication
-- This enables Supabase to broadcast INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;

-- Verify the configuration (optional, for debugging)
-- You can check this in psql or Supabase SQL editor:
-- SELECT relreplident FROM pg_class WHERE relname = 'order_events';
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_events';









