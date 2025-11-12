-- ============================================================================
-- Allow Runners and Customers to Update Rating Fields
-- ============================================================================
-- Purpose: Enable rating updates for completed orders while maintaining security
-- Behavior: Runners can update customer_rating_by_runner, customers can update runner_rating
-- Security: Only for completed orders, only for assigned orders
-- Note: These policies work alongside the existing FSM policies
-- The FSM RPC function (rpc_advance_order) uses SECURITY DEFINER to bypass RLS
-- These policies allow direct updates for rating fields on completed orders

-- First, ensure rating columns exist (run 20250113_add_ratings_to_orders.sql first)
-- This migration assumes those columns already exist

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

-- Note: These policies work with OR logic alongside the "RPC can update orders" policy
-- So if any policy allows the update, it will proceed
-- The USING clause checks if the user CAN update (based on role, ownership, status)
-- The WITH CHECK clause ensures the updated row STILL meets the same criteria

