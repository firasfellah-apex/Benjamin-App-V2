/*
# Add Missing Order Fields

## Changes
- Add `customer_notes` field to orders table for delivery instructions
- Add `cancelled_by` field to track who cancelled the order (customer or admin)

## Reason
- TypeScript interfaces expect these fields but they were missing from the schema
- Causing 406 errors when trying to select order data
*/

-- Add customer_notes field for delivery instructions
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_notes text;

-- Add cancelled_by field to track who cancelled (customer_id or admin_id)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN orders.customer_notes IS 'Special delivery instructions from the customer';
COMMENT ON COLUMN orders.cancelled_by IS 'User ID of who cancelled the order (customer or admin)';
