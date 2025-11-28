-- ATM System Migration
-- Creates tables for ATM locations, address preferences, and adds ATM fields to orders

-- 1. Create atm_locations table
CREATE TABLE IF NOT EXISTS atm_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  network text,
  surcharge_min_cents integer,
  surcharge_max_cents integer,
  surcharge_notes text,
  is_in_branch boolean DEFAULT false,
  is_in_store boolean DEFAULT false,
  open_24h boolean DEFAULT false,
  open_hours_json jsonb,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'google_places',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT atm_locations_status_check CHECK (status IN ('active', 'temp_closed', 'perm_closed'))
);

-- Indexes for atm_locations
CREATE UNIQUE INDEX IF NOT EXISTS idx_atm_locations_google_place_id ON atm_locations(google_place_id);
CREATE INDEX IF NOT EXISTS idx_atm_locations_status ON atm_locations(status);
CREATE INDEX IF NOT EXISTS idx_atm_locations_location ON atm_locations(lat, lng);

-- Comments
COMMENT ON TABLE atm_locations IS 'Master list of ATM locations in Miami, preloaded from Google Places';
COMMENT ON COLUMN atm_locations.google_place_id IS 'Unique Google Places API place_id';
COMMENT ON COLUMN atm_locations.status IS 'active: operational, temp_closed: temporarily closed, perm_closed: permanently closed';

-- 2. Create address_atm_preferences table
CREATE TABLE IF NOT EXISTS address_atm_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_address_id uuid NOT NULL REFERENCES customer_addresses(id) ON DELETE CASCADE,
  atm_id uuid NOT NULL REFERENCES atm_locations(id) ON DELETE CASCADE,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT address_atm_preferences_unique UNIQUE (customer_address_id, atm_id)
);

-- Indexes for address_atm_preferences
CREATE UNIQUE INDEX IF NOT EXISTS idx_address_atm_preferences_unique ON address_atm_preferences(customer_address_id, atm_id);
CREATE INDEX IF NOT EXISTS idx_address_atm_preferences_address ON address_atm_preferences(customer_address_id);

-- Comments
COMMENT ON TABLE address_atm_preferences IS 'Caches preferred ATM for each delivery address to avoid recalculating on every order';
COMMENT ON COLUMN address_atm_preferences.times_used IS 'Number of times this ATM has been used for this address';

-- 3. Add ATM fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS atm_id uuid REFERENCES atm_locations(id),
ADD COLUMN IF NOT EXISTS atm_distance_meters integer;

-- Add pickup location fields (where runner withdraws cash - the ATM)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pickup_name text,
ADD COLUMN IF NOT EXISTS pickup_address text,
ADD COLUMN IF NOT EXISTS pickup_lat double precision,
ADD COLUMN IF NOT EXISTS pickup_lng double precision;

-- Index for orders.atm_id
CREATE INDEX IF NOT EXISTS idx_orders_atm_id ON orders(atm_id);

-- Comments
COMMENT ON COLUMN orders.atm_id IS 'Reference to the ATM location where runner should withdraw cash';
COMMENT ON COLUMN orders.atm_distance_meters IS 'Distance in meters from delivery address to ATM when order was created';
COMMENT ON COLUMN orders.pickup_name IS 'Name of the ATM where runner should withdraw cash';
COMMENT ON COLUMN orders.pickup_address IS 'Address of the ATM where runner should withdraw cash';
COMMENT ON COLUMN orders.pickup_lat IS 'Latitude of the ATM pickup location';
COMMENT ON COLUMN orders.pickup_lng IS 'Longitude of the ATM pickup location';

-- 4. Enable RLS on atm_locations
ALTER TABLE atm_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow SELECT for authenticated/anon users (public data)
DROP POLICY IF EXISTS "atm_locations_select_public" ON atm_locations;
CREATE POLICY "atm_locations_select_public" ON atm_locations
  FOR SELECT
  USING (true);

-- RLS Policy: Deny INSERT/UPDATE/DELETE for normal clients (service role only)
DROP POLICY IF EXISTS "atm_locations_no_client_write" ON atm_locations;
CREATE POLICY "atm_locations_no_client_write" ON atm_locations
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 5. Enable RLS on address_atm_preferences
ALTER TABLE address_atm_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access preferences for their own addresses
DROP POLICY IF EXISTS "address_atm_preferences_owner" ON address_atm_preferences;
CREATE POLICY "address_atm_preferences_owner" ON address_atm_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_addresses
      WHERE customer_addresses.id = address_atm_preferences.customer_address_id
      AND customer_addresses.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_addresses
      WHERE customer_addresses.id = address_atm_preferences.customer_address_id
      AND customer_addresses.customer_id = auth.uid()
    )
  );

