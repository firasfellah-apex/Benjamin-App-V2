-- ============================================================================
-- STEP 1: Add Rating Columns to Orders Table
-- ============================================================================
-- Copy and paste this ENTIRE section into Supabase SQL Editor and run it

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

-- ============================================================================
-- STEP 2: Allow Runners and Customers to Update Rating Fields
-- ============================================================================
-- After STEP 1 completes successfully, copy and paste this ENTIRE section and run it

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Runners can rate customers on completed orders" ON orders;
DROP POLICY IF EXISTS "Customers can rate runners on completed orders" ON orders;

-- Also update the SELECT policy for runners to allow viewing completed orders they're assigned to
-- This ensures runners can see completed orders to rate customers
DROP POLICY IF EXISTS "Runners can view available and assigned orders" ON orders;
CREATE POLICY "Runners can view available and assigned orders" ON orders
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'runner'::user_role) AND 
    (
      status = 'Pending' OR 
      runner_id = auth.uid()
    )
  );

-- Policy: Runners can update customer_rating_by_runner for completed orders they're assigned to
-- This allows runners to rate customers after completing a delivery
CREATE POLICY "Runners can rate customers on completed orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if user is a runner
    has_role(auth.uid(), 'runner'::user_role) AND
    -- Check if runner is assigned to this order
    runner_id = auth.uid() AND
    -- Only allow updates to completed orders
    status = 'Completed'
  )
  WITH CHECK (
    -- Ensure the update maintains the same constraints
    has_role(auth.uid(), 'runner'::user_role) AND
    runner_id = auth.uid() AND
    status = 'Completed'
  );

-- Policy: Customers can update runner_rating for completed orders they own
-- This allows customers to rate runners after receiving their delivery
CREATE POLICY "Customers can rate runners on completed orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if user is a customer
    has_role(auth.uid(), 'customer'::user_role) AND
    -- Check if customer owns this order
    customer_id = auth.uid() AND
    -- Only allow updates to completed orders
    status = 'Completed'
  )
  WITH CHECK (
    -- Ensure the update maintains the same constraints
    has_role(auth.uid(), 'customer'::user_role) AND
    customer_id = auth.uid() AND
    status = 'Completed'
  );









