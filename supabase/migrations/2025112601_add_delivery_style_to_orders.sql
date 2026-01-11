/*
# Add Delivery Style and Delivery Mode to Orders

## Changes
- Add `delivery_style` column (text, 'COUNTED' | 'SPEED') to orders table
- Add `delivery_mode` column (text, 'quick_handoff' | 'count_confirm') for backward compatibility

## Reason
- Customers select delivery style (Counted vs Speed) when creating orders
- Runners need to see the correct delivery style to follow proper handoff procedures
- Currently missing columns cause orders to default to 'SPEED' even when customer selects 'Counted'
*/

-- Add delivery_style column (primary field)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_style text CHECK (delivery_style IN ('COUNTED', 'SPEED'));

-- Add delivery_mode column (legacy/backward compatibility)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_mode text CHECK (delivery_mode IN ('quick_handoff', 'count_confirm'));

-- Add comments for documentation
COMMENT ON COLUMN orders.delivery_style IS 'Delivery style: COUNTED (customer counts cash) or SPEED (quick handoff)';
COMMENT ON COLUMN orders.delivery_mode IS 'Legacy delivery mode field for backward compatibility: count_confirm or quick_handoff';

