-- ============================================================================
-- Enable Realtime for Profiles Table
-- ============================================================================
-- Purpose: Enable Supabase Realtime for the `profiles` table to allow instant
--          updates of runner online/offline status in admin User Management
-- 
-- Changes:
-- 1. Replica Identity: Set to FULL so UPDATE events include all column values
-- 2. Realtime Publication: Add profiles table to supabase_realtime publication
--
-- Why This Matters:
-- - Without replica identity FULL, UPDATE events only include the primary key
-- - Without being in the publication, no realtime events are emitted at all
-- - This enables instant online/offline status updates without polling
--
-- Security:
-- - Realtime respects existing RLS policies
-- - Users only receive events for rows they can SELECT
-- - No additional security configuration needed

-- Enable full replica identity for profiles table
-- This ensures UPDATE events include all column values, not just the primary key
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles table to the realtime publication
-- This enables Supabase to broadcast INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Note: After running this migration, you must also enable Realtime in the
-- Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Find the `profiles` table
-- 3. Toggle Realtime to ON

