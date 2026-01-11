-- Simple fix: Update the UPDATE statement in rpc_advance_order to set timestamps
-- This replaces the existing UPDATE statement in the function

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
AS $$
DECLARE
  v_order orders;
  v_old_status order_status;
  v_actor_id uuid;
  v_actor_role user_role;
  v_existing_event RECORD;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT role[1] INTO v_actor_role FROM profiles WHERE id = v_actor_id;
  
  IF p_client_action_id IS NOT NULL THEN
    SELECT * INTO v_existing_event
    FROM order_events
    WHERE order_id = p_order_id
      AND client_action_id = p_client_action_id
    LIMIT 1;
    
    IF FOUND THEN
      SELECT * INTO v_order FROM orders WHERE id = p_order_id;
      RETURN v_order;
    END IF;
  END IF;
  
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  v_old_status := v_order.status;
  
  IF NOT EXISTS (
    SELECT 1 FROM order_status_transitions
    WHERE from_status = v_old_status AND to_status = p_next_status
  ) THEN
    RAISE EXCEPTION 'Illegal transition: % → %', v_old_status, p_next_status;
  END IF;
  
  IF p_next_status = 'Runner Accepted' THEN
    IF v_actor_role != 'runner' THEN
      RAISE EXCEPTION 'Only runners can accept orders';
    END IF;
    
    IF v_order.runner_id IS NULL THEN
      v_order.runner_id := v_actor_id;
    END IF;
  END IF;
  
  IF p_next_status IN ('Runner at ATM', 'Cash Withdrawn', 'Pending Handoff') THEN
    IF v_order.runner_id != v_actor_id THEN
      RAISE EXCEPTION 'Only the assigned runner can update this order';
    END IF;
  END IF;
  
  IF p_next_status = 'Cancelled' THEN
    IF v_actor_role = 'customer' AND v_order.customer_id != v_actor_id THEN
      RAISE EXCEPTION 'You can only cancel your own orders';
    END IF;
    
    IF v_actor_role = 'runner' THEN
      RAISE EXCEPTION 'Runners cannot cancel orders';
    END IF;
    
    v_order.cancelled_by := v_actor_id;
    v_order.cancellation_reason := COALESCE(p_metadata->>'reason', 'Cancelled by ' || v_actor_role);
  END IF;
  
  UPDATE orders
  SET 
    status = p_next_status,
    runner_id = v_order.runner_id,
    cancelled_by = v_order.cancelled_by,
    cancellation_reason = v_order.cancellation_reason,
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
$$;

GRANT EXECUTE ON FUNCTION rpc_advance_order TO authenticated;

