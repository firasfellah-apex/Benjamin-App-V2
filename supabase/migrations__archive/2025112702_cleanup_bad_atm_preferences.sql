-- Cleanup Bad ATM Preferences
-- Removes preferences that were set using the old naive "nearest distance" algorithm
-- This allows addresses to get better ATMs (major banks) using the new scoring system

-- Option 1: Clear all preferences created before scoring was introduced
-- This ensures all addresses get re-evaluated with the new scoring algorithm
DELETE FROM address_atm_preferences
WHERE created_at < TIMESTAMP '2025-11-27 00:00:00';

-- Option 2: If you know a specific bad address_id (e.g., for 1091 West 59th Place, Hialeah)
-- Uncomment and use this instead:
-- DELETE FROM address_atm_preferences
-- WHERE customer_address_id = '<KNOWN_ADDRESS_ID_FOR_1091_W_59TH_PLACE>';

-- Note: After running this migration, the next order created for each address will
-- trigger the new scored ATM selection, which will prefer major banks over gas stations.

COMMENT ON TABLE address_atm_preferences IS 'Caches preferred ATM for each delivery address. Preferences are now set using a scoring algorithm that prefers major banks over gas stations.';

