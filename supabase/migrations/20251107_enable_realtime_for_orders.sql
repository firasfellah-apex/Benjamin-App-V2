/*
# Enable Realtime for Orders Table

## Purpose
Enable Supabase Realtime for the `orders` table to allow instant updates across Customer, Runner, and Admin views.

## Changes
1. **Replica Identity**: Set to FULL so UPDATE events include all column values
2. **Realtime Publication**: Add orders table to supabase_realtime publication

## Why This Matters
- Without replica identity FULL, UPDATE events only include the primary key
- Without being in the publication, no realtime events are emitted at all
- This enables instant order status updates without polling

## Security
- Realtime respects existing RLS policies
- Users only receive events for rows they can SELECT
- No additional security configuration needed

## Testing
After applying this migration:
1. Create an order as a customer
2. Watch the Runner's Available Orders page - should appear instantly
3. Accept the order as a runner
4. Watch the Customer's order detail page - status should update instantly
*/

-- Enable full replica identity for orders table
-- This ensures UPDATE events include all column values, not just the primary key
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add orders table to the realtime publication
-- This enables Supabase to broadcast INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Verify the configuration (optional, for debugging)
-- You can check this in psql or Supabase SQL editor:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'orders';
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
