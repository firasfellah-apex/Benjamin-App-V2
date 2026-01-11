-- ============================================================================
-- Add Rating Timestamps for Edit Window Support
-- ============================================================================
-- Purpose: Track when ratings were submitted to enable edit window (5 minutes)
-- Behavior: Store timestamp when rating is first set, allow edits within window

-- Add timestamp columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_rating_by_runner_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runner_rating_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN orders.customer_rating_by_runner_at IS 'Timestamp when runner rated customer (used for edit window)';
COMMENT ON COLUMN orders.runner_rating_at IS 'Timestamp when customer rated runner (used for edit window)';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_rating_at ON orders(customer_rating_by_runner_at) WHERE customer_rating_by_runner_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_runner_rating_at ON orders(runner_rating_at) WHERE runner_rating_at IS NOT NULL;

