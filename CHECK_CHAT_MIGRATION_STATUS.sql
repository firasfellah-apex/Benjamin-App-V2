-- ============================================================================
-- Check Chat Migration Status
-- ============================================================================
-- Run this in Supabase SQL Editor to verify if the messages table exists
-- and if Realtime is enabled

-- 1. Check if messages table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'messages'
    ) 
    THEN '✅ Messages table exists'
    ELSE '❌ Messages table DOES NOT EXIST - Run migration: 20250112_create_messages_table.sql'
  END AS table_status;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messages'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 
  policyname,
  cmd AS operation,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'messages'
ORDER BY policyname;

-- 4. Check if Realtime is enabled for messages table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'messages'
    )
    THEN '✅ Realtime is enabled for messages table'
    ELSE '❌ Realtime is NOT enabled - Enable in Dashboard → Database → Replication → messages'
  END AS realtime_status;

-- 5. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'messages';

-- 6. Test query (should return empty if table exists, error if it doesn't)
SELECT COUNT(*) as message_count FROM messages;

