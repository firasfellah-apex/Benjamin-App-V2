-- Allow Admin to Cancel Orders from Any Status
-- 
-- Purpose: Enable admins to cancel orders even after cash withdrawal
-- This is necessary for emergency situations, fraud prevention, and operational flexibility
--
-- Changes:
-- 1. Modify FSM function to allow admin to bypass transition table check for cancellation
-- 2. Add all cancellation transitions to transition table for completeness
-- 3. Keep audit trail and proper cancellation metadata

-- ============================================================================
-- 1. Add all cancellation transitions to transition table (for audit trail)
-- ============================================================================

INSERT INTO order_status_transitions (from_status, to_status, description) VALUES
  ('Runner at ATM', 'Cancelled', 'Admin cancels order after runner arrives at ATM'),
  ('Cash Withdrawn', 'Cancelled', 'Admin cancels order after cash withdrawal'),
  ('Pending Handoff', 'Cancelled', 'Admin cancels order during handoff')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- ============================================================================
-- 2. Update FSM function to allow admin to cancel from any status
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_advance_order(
  p_order_id uuid,
  p_next_status order_status,
  p_client_action_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_order orders;
  v_old_status order_status;
  v_actor_id uuid;
  v_actor_role user_role;
  v_existing_event order_events;
  v_is_admin boolean;
  v_is_runner boolean;
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get actor role and check if admin/runner
  -- role is an array (user_role[]), so we get the first role for v_actor_role
  -- and check if 'admin'/'runner' is in the array
  -- IMPORTANT: Extract role[1] directly and cast to user_role to ensure type safety
  SELECT 
    (role[1])::user_role,
    COALESCE('admin' = ANY(role), false),
    COALESCE('runner' = ANY(role), false)
  INTO v_actor_role, v_is_admin, v_is_runner
  FROM profiles 
  WHERE id = v_actor_id;
  
  -- Handle case where profile doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Handle case where role is null or empty
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'User profile has no role';
  END IF;
  
  -- Ensure boolean flags are set (defensive programming)
  v_is_admin := COALESCE(v_is_admin, false);
  v_is_runner := COALESCE(v_is_runner, false);
  
  -- Check for idempotency: if client_action_id exists, return existing result
  IF p_client_action_id IS NOT NULL THEN
    SELECT * INTO v_existing_event
    FROM order_events
    WHERE order_id = p_order_id
      AND client_action_id = p_client_action_id
    LIMIT 1;
    
    IF FOUND THEN
      -- Return the order as it was after this action
      SELECT * INTO v_order FROM orders WHERE id = p_order_id;
      RETURN v_order;
    END IF;
  END IF;
  
  -- Lock the order row for update
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  v_old_status := v_order.status;
  
  -- Special case: Admin can cancel from any status (except Completed)
  -- This bypasses the transition table check for admin cancellations
  IF p_next_status = 'Cancelled' AND v_is_admin THEN
    -- Admin cancellation: Skip transition table check
    -- But still validate that order is not already completed
    IF v_old_status = 'Completed' THEN
      RAISE EXCEPTION 'Cannot cancel a completed order';
    END IF;
    
    -- Store who cancelled
    v_order.cancelled_by := v_actor_id;
    v_order.cancellation_reason := COALESCE(p_metadata->>'reason', 'Cancelled by admin');
    
    -- Update order status with cancellation timestamp
    UPDATE orders
    SET 
      status = 'Cancelled',
      cancelled_by = v_order.cancelled_by,
      cancellation_reason = v_order.cancellation_reason,
      cancelled_at = CASE 
        WHEN cancelled_at IS NULL THEN now()
        ELSE cancelled_at
      END,
      updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;
    
    -- Record event in audit trail
    INSERT INTO order_events (
      order_id,
      from_status,
      to_status,
      actor_id,
      actor_role,
      client_action_id,
      metadata
    ) VALUES (
      p_order_id,
      v_old_status,
      'Cancelled',
      v_actor_id,
      v_actor_role,
      p_client_action_id,
      jsonb_build_object(
        'reason', v_order.cancellation_reason,
        'cancelled_by', v_actor_id,
        'admin_override', true
      )
    );
    
    RETURN v_order;
  END IF;
  
  -- For all other transitions, check if transition is allowed
  IF NOT EXISTS (
    SELECT 1 FROM order_status_transitions
    WHERE from_status = v_old_status AND to_status = p_next_status
  ) THEN
    RAISE EXCEPTION 'Illegal transition: % → %', v_old_status, p_next_status;
  END IF;
  
  -- Perform role-specific validations
  IF p_next_status = 'Runner Accepted' THEN
    -- Only runners can accept orders
    IF NOT v_is_runner THEN
      RAISE EXCEPTION 'Only runners can accept orders';
    END IF;
    
    -- Assign runner_id if not already set
    IF v_order.runner_id IS NULL THEN
      v_order.runner_id := v_actor_id;
    END IF;
  END IF;
  
  IF p_next_status IN ('Runner at ATM', 'Cash Withdrawn', 'Pending Handoff') THEN
    -- Only the assigned runner can update these statuses
    IF v_order.runner_id != v_actor_id THEN
      RAISE EXCEPTION 'Only the assigned runner can update this order';
    END IF;
  END IF;
  
  IF p_next_status = 'Cancelled' THEN
    -- Non-admin cancellation: Apply standard rules
    -- Customer can cancel their own orders
    -- Runner cannot cancel
    -- Note: Admin cancellation is handled earlier, so this is only for non-admins
    IF v_actor_role = 'customer' AND v_order.customer_id != v_actor_id THEN
      RAISE EXCEPTION 'You can only cancel your own orders';
    END IF;
    
    IF v_is_runner THEN
      RAISE EXCEPTION 'Runners cannot cancel orders';
    END IF;
    
    -- Store who cancelled
    v_order.cancelled_by := v_actor_id;
    v_order.cancellation_reason := COALESCE(p_metadata->>'reason', 'Cancelled by ' || v_actor_role);
  END IF;
  
  -- Update order status with appropriate timestamps
  UPDATE orders
  SET 
    status = p_next_status,
    runner_id = v_order.runner_id,
    cancelled_by = v_order.cancelled_by,
    cancellation_reason = v_order.cancellation_reason,
    -- Set timestamp fields based on status transition
    runner_accepted_at = CASE 
      WHEN p_next_status = 'Runner Accepted' AND v_order.runner_accepted_at IS NULL 
      THEN now() 
      ELSE v_order.runner_accepted_at 
    END,
    runner_at_atm_at = CASE 
      WHEN p_next_status = 'Runner at ATM' AND v_order.runner_at_atm_at IS NULL 
      THEN now() 
      ELSE v_order.runner_at_atm_at 
    END,
    cash_withdrawn_at = CASE 
      WHEN p_next_status = 'Cash Withdrawn' AND v_order.cash_withdrawn_at IS NULL 
      THEN now() 
      ELSE v_order.cash_withdrawn_at 
    END,
    handoff_completed_at = CASE 
      WHEN p_next_status = 'Completed' AND v_order.handoff_completed_at IS NULL 
      THEN now() 
      ELSE v_order.handoff_completed_at 
    END,
    cancelled_at = CASE 
      WHEN p_next_status = 'Cancelled' AND v_order.cancelled_at IS NULL 
      THEN now() 
      ELSE v_order.cancelled_at 
    END,
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  -- Record event in audit trail
  INSERT INTO order_events (
    order_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    client_action_id,
    metadata
  ) VALUES (
    p_order_id,
    v_old_status,
    p_next_status,
    v_actor_id,
    v_actor_role,
    p_client_action_id,
    p_metadata
  );
  
  RETURN v_order;
END;
$BODY$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION rpc_advance_order TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_advance_order IS 'Advance order status with FSM validation. Admins can cancel orders from any status (except Completed).';
