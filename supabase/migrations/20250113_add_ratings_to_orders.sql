-- ============================================================================
-- Add Ratings to Orders and Profiles
-- ============================================================================
-- Purpose: Enable 5-star rating system for customer → runner and runner → customer
-- Behavior: One rating per side per order, only on completed orders

-- Add rating columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS runner_rating INT CHECK (runner_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS runner_rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS customer_rating_by_runner INT CHECK (customer_rating_by_runner BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS customer_rating_tags TEXT;

-- Add aggregate rating columns to profiles table (read-only helpers for admin views)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avg_runner_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS runner_rating_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_customer_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS customer_rating_count INT DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_runner_rating ON orders(runner_rating) WHERE runner_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_rating_by_runner ON orders(customer_rating_by_runner) WHERE customer_rating_by_runner IS NOT NULL;

-- Add comments
COMMENT ON COLUMN orders.runner_rating IS 'Customer rating of runner (1-5 stars), only for completed orders';
COMMENT ON COLUMN orders.customer_rating_by_runner IS 'Runner rating of customer (1-5 stars), only for completed orders';
COMMENT ON COLUMN profiles.avg_runner_rating IS 'Average rating received by runner (read-only aggregate)';
COMMENT ON COLUMN profiles.avg_customer_rating IS 'Average rating received by customer (read-only aggregate)';









