/*
# Add icon field to customer_addresses table

## Purpose
Add an `icon` field to store the Lucide icon name for address labels.
This allows users to customize the icon displayed with each address.

## Changes
1. Add `icon` column (text, nullable, defaults to 'Home')
2. Update existing addresses to have 'Home' as default icon

## Why This Matters
- Users can visually identify addresses by icon
- Icons are stored as Lucide icon names (e.g., 'Home', 'Building2', 'Heart')
- Allows flexible icon selection while maintaining consistency
*/

-- Add icon column to customer_addresses table
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

