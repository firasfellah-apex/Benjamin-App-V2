-- Check bank institution data for all profiles with bank connections
-- This query doesn't require a specific user ID

SELECT 
  id,
  email,
  first_name,
  last_name,
  plaid_item_id,
  bank_institution_name,
  bank_institution_logo_url,
  CASE 
    WHEN bank_institution_logo_url IS NOT NULL THEN 
      LEFT(bank_institution_logo_url, 50) || '...'
    ELSE 
      'NULL'
  END as logo_preview,
  updated_at
FROM profiles
WHERE plaid_item_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- If you want to check a specific user, replace 'YOUR-USER-ID-HERE' with the actual UUID
-- SELECT 
--   id,
--   email,
--   first_name,
--   last_name,
--   plaid_item_id,
--   bank_institution_name,
--   bank_institution_logo_url,
--   updated_at
-- FROM profiles
-- WHERE id = 'YOUR-USER-ID-HERE';

