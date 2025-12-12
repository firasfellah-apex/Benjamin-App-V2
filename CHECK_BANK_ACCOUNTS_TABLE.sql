-- Quick check to verify bank_accounts table exists and has data

-- 1. Check if table exists
SELECT 
  'Table exists' as check_type,
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'bank_accounts';

-- 2. Check table structure
SELECT 
  'Table structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- 3. Check if there's a unique constraint on (user_id, plaid_item_id)
SELECT 
  'Unique constraint' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'bank_accounts'
  AND constraint_type = 'UNIQUE';

-- 4. Count bank accounts (replace with your user_id)
SELECT 
  'Bank accounts count' as check_type,
  COUNT(*) as total_banks,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT plaid_item_id) as unique_plaid_items
FROM bank_accounts;

-- 5. Show all bank accounts (replace with your user_id)
SELECT 
  'All bank accounts' as check_type,
  id,
  user_id,
  plaid_item_id,
  bank_institution_name,
  is_primary,
  created_at
FROM bank_accounts
ORDER BY created_at DESC;

