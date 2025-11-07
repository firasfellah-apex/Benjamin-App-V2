/*
# Add Customer Addresses Table

## Plain English Explanation
This migration adds a new table to store customer delivery addresses. Customers can save multiple addresses (Home, Office, etc.) and set one as default. Each address includes full street information plus latitude/longitude for future distance-based pricing.

## Table: customer_addresses

### Columns
- `id` (uuid, primary key): Unique identifier for each address
- `customer_id` (uuid, foreign key): References the customer who owns this address
- `label` (text, required): Friendly name like "Home", "Office", "Lobby"
- `line1` (text, required): Street address
- `line2` (text, optional): Apartment, suite, or unit number
- `city` (text, required): City name
- `state` (text, required): State abbreviation (e.g., "NY", "CA")
- `postal_code` (text, required): ZIP code
- `latitude` (double precision, optional): Geocoded latitude for distance calculations
- `longitude` (double precision, optional): Geocoded longitude for distance calculations
- `is_default` (boolean): Whether this is the customer's default address
- `created_at` (timestamptz): When the address was created

### Indexes
- Index on `customer_id` for fast lookup of all addresses for a customer
- Index on `customer_id, is_default` for quick default address retrieval

## Table: orders (modifications)

### New Columns
- `address_id` (uuid, foreign key): References customer_addresses table
- `address_snapshot` (jsonb): Frozen copy of address at time of order (prevents historical changes)

### Notes
- `customer_address` field remains for backward compatibility but will be deprecated
- `address_snapshot` preserves exact delivery location even if customer later edits/deletes the address

## Security
- RLS enabled on customer_addresses table
- Customers can only view/edit their own addresses
- Admins have full access to all addresses for support purposes
- Runners cannot access customer addresses until order is accepted (handled in application layer)

## Future Enhancements
- Geocoding integration to auto-fill lat/lng
- Address validation via USPS API
- Distance-based pricing using lat/lng coordinates
*/

-- Create customer_addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  latitude double precision,
  longitude double precision,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id 
  ON customer_addresses(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_default 
  ON customer_addresses(customer_id, is_default) 
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own addresses
CREATE POLICY "Customers can view own addresses" ON customer_addresses
  FOR SELECT 
  USING (auth.uid() = customer_id);

-- Policy: Customers can insert their own addresses
CREATE POLICY "Customers can insert own addresses" ON customer_addresses
  FOR INSERT 
  WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can update their own addresses
CREATE POLICY "Customers can update own addresses" ON customer_addresses
  FOR UPDATE 
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can delete their own addresses
CREATE POLICY "Customers can delete own addresses" ON customer_addresses
  FOR DELETE 
  USING (auth.uid() = customer_id);

-- Policy: Admins have full access to all addresses
CREATE POLICY "Admins have full access to addresses" ON customer_addresses
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add new columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES customer_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address_snapshot jsonb;

-- Create index on address_id for joins
CREATE INDEX IF NOT EXISTS idx_orders_address_id 
  ON orders(address_id);

-- Function to ensure only one default address per customer
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this address as default, unset all other defaults for this customer
  IF NEW.is_default = true THEN
    UPDATE customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce single default address
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON customer_addresses;
CREATE TRIGGER trigger_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();
