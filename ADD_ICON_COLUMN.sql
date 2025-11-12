-- Add icon column to customer_addresses table
-- Run this in your Supabase SQL Editor

ALTER TABLE customer_addresses 
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Home';

-- Update existing addresses to have 'Home' as default icon if null
UPDATE customer_addresses 
  SET icon = 'Home' 
  WHERE icon IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_addresses.icon IS 'Lucide icon name for address label (e.g., Home, Building2, Heart)';

-- Create index for icon lookups (optional, but helpful for filtering)
CREATE INDEX IF NOT EXISTS idx_customer_addresses_icon 
  ON customer_addresses(icon);

