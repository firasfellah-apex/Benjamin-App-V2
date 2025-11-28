-- Clear bad ATM preference for 1091 W 59th Pl, Hialeah
-- Run this in Supabase SQL Editor to clear the cached preference for this address
-- Then create a new order to trigger recomputation with bank-first logic

-- Step 1: Find the address_id for 1091 W 59th Pl, Hialeah
-- (Adjust the WHERE clause to match your exact address)
SELECT 
  id,
  label,
  line1,
  city,
  state
FROM customer_addresses
WHERE line1 ILIKE '%1091%59th%' 
  AND city ILIKE '%hialeah%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Once you have the address_id, delete the bad preference
-- Replace '<ADDRESS_ID>' with the actual ID from Step 1
DELETE FROM address_atm_preferences
WHERE customer_address_id = '<ADDRESS_ID>';

-- Step 3: Verify it's deleted
SELECT 
  aap.*,
  ca.line1,
  ca.city,
  al.name as atm_name
FROM address_atm_preferences aap
JOIN customer_addresses ca ON aap.customer_address_id = ca.id
LEFT JOIN atm_locations al ON aap.atm_id = al.id
WHERE ca.line1 ILIKE '%1091%59th%'
  AND ca.city ILIKE '%hialeah%';

-- If the query above returns 0 rows, the preference has been cleared successfully.
-- Now create a new order from that address to trigger the bank-first selection.

