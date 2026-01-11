-- Add 'inactive' status to atm_locations for bad locations (bitcoin ATMs, smoke shops, etc.)
-- This allows us to mark undesirable ATMs without deleting them

ALTER TABLE atm_locations
DROP CONSTRAINT IF EXISTS atm_locations_status_check;

ALTER TABLE atm_locations
ADD CONSTRAINT atm_locations_status_check 
CHECK (status IN ('active', 'temp_closed', 'perm_closed', 'inactive'));

COMMENT ON COLUMN atm_locations.status IS 'active: operational, temp_closed: temporarily closed, perm_closed: permanently closed, inactive: undesirable location (bitcoin/crypto, smoke shops, etc.)';

