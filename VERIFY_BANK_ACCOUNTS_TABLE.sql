-- Verify that bank_accounts table exists and has the correct structure

-- Check if table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'bank_accounts';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'bank_accounts';

-- Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bank_accounts';

-- Check trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'bank_accounts';

