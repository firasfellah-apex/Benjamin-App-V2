/*
# Add cancelled_by field to orders table

## Purpose
Add a field to track which admin user cancelled an order, supporting the admin order cancellation feature.

## Changes
1. Add `cancelled_by` column to orders table
   - Type: uuid (references profiles.id)
   - Nullable: true (only set when order is cancelled by admin)
   - Purpose: Track which admin performed the cancellation

## Notes
- This field will only be populated when an admin cancels a pending order
- Customer-initiated cancellations (if implemented later) would leave this null
- The field references the profiles table to maintain referential integrity
*/

-- Add cancelled_by column to orders table
ALTER TABLE orders 
ADD COLUMN cancelled_by uuid REFERENCES profiles(id);

-- Add index for performance
CREATE INDEX idx_orders_cancelled_by ON orders(cancelled_by);

-- Add comment for documentation
COMMENT ON COLUMN orders.cancelled_by IS 'Admin user who cancelled the order (null if cancelled by customer or system)';
