/*
# Add delivery_notes to customer_addresses

## Plain English Explanation
This migration adds a `delivery_notes` field to the `customer_addresses` table,
allowing users to save location-specific delivery instructions (e.g., "Ring doorbell",
"Meet in lobby") with each saved address. This improves UX by treating addresses
as "delivery profiles" rather than requiring users to re-enter notes per order.

## Changes
1. Add `delivery_notes` column to `customer_addresses` table
   - Type: text (nullable)
   - Purpose: Store location-specific handoff instructions
   - Examples: "Ring doorbell", "Meet in lobby", "Call when you arrive"

## Security
- No RLS changes needed (inherits existing address-level policies)
- Notes are tied to address ownership

## Notes
- Backwards compatible: existing addresses will have NULL notes
- Frontend will auto-populate order notes from selected address
- Users can override per-order if needed
*/

-- Add delivery_notes column to customer_addresses
ALTER TABLE customer_addresses 
ADD COLUMN delivery_notes text;

-- Add comment for documentation
COMMENT ON COLUMN customer_addresses.delivery_notes IS 'Location-specific delivery instructions (e.g., "Ring doorbell", "Meet in lobby")';
