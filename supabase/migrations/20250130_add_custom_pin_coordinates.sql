/*
# Add Custom Pin Coordinates to Customer Addresses

## Plain English Explanation
This migration adds fields to store custom pin coordinates that customers can set by moving the map pin. These coordinates are separate from the geocoded address coordinates and are used to specify the exact meeting location for runners, while the original coordinates are still used for ATM selection.

## Table: customer_addresses

### New Columns
- `custom_pin_lat` (double precision, optional): Custom latitude set by customer when moving the pin
- `custom_pin_lng` (double precision, optional): Custom longitude set by customer when moving the pin

### Notes
- These fields are optional - if not set, the original latitude/longitude are used for display
- ATM selection always uses the original latitude/longitude (not custom pin)
- Custom pin coordinates are included in address snapshots for orders
*/

-- Add custom pin coordinate columns
ALTER TABLE customer_addresses 
  ADD COLUMN IF NOT EXISTS custom_pin_lat double precision,
  ADD COLUMN IF NOT EXISTS custom_pin_lng double precision;

-- Add comment explaining the purpose
COMMENT ON COLUMN customer_addresses.custom_pin_lat IS 'Custom latitude set by customer when moving the map pin. Used for runner meeting location. ATM selection uses original latitude.';
COMMENT ON COLUMN customer_addresses.custom_pin_lng IS 'Custom longitude set by customer when moving the map pin. Used for runner meeting location. ATM selection uses original longitude.';

