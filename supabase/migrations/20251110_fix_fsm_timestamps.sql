/*
# Fix FSM RPC to Set Timestamp Fields

## Purpose
Update `rpc_advance_order` to automatically set timestamp fields when order status changes:
- `runner_accepted_at` when status changes to "Runner Accepted"
- `runner_at_atm_at` when status changes to "Runner at ATM"
- `cash_withdrawn_at` when status changes to "Cash Withdrawn"
- `handoff_completed_at` when status changes to "Completed"
- `cancelled_at` when status changes to "Cancelled"

## Benefits
- Ensures timestamps are always set correctly
- Maintains data consistency
- Provides accurate audit trail
*/

-- Update rpc_advance_order to set timestamp fields
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
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get actor role
  SELECT role[1] INTO v_actor_role FROM profiles WHERE id = v_actor_id;
  
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
  
  -- Check if transition is allowed
  IF NOT EXISTS (
    SELECT 1 FROM order_status_transitions
    WHERE from_status = v_old_status AND to_status = p_next_status
  ) THEN
    RAISE EXCEPTION 'Illegal transition: % → %', v_old_status, p_next_status;
  END IF;
  
  -- Perform role-specific validations
  IF p_next_status = 'Runner Accepted' THEN
    -- Only runners can accept orders
    IF v_actor_role != 'runner' THEN
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
    -- Admin can cancel any order
    -- Runner cannot cancel
    IF v_actor_role = 'customer' AND v_order.customer_id != v_actor_id THEN
      RAISE EXCEPTION 'You can only cancel your own orders';
    END IF;
    
    IF v_actor_role = 'runner' THEN
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

