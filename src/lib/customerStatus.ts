/**
 * Customer-Facing Status Mapping
 * 
 * Maps internal operational statuses to simplified, customer-friendly labels.
 * This provides a clean, reassuring experience while maintaining full granular
 * control internally for runners and admins.
 * 
 * Philosophy: We never lie; we just group technical steps under simpler labels.
 */

import type { OrderStatus, Order } from '@/types/types';

export type CustomerFacingStep = 
  | 'REQUESTED' 
  | 'ASSIGNED' 
  | 'PREPARING' 
  | 'ON_THE_WAY' 
  | 'ARRIVED' 
  | 'COMPLETED' 
  | 'CANCELED';

export interface CustomerFacingStatus {
  label: string;
  step: CustomerFacingStep;
  description: string;
}

/**
 * Check if runner has arrived based on order data
 * 
 * Checks for order event with client_action_id = "runner_arrived"
 * to determine if runner has confirmed arrival.
 * 
 * @param order - Order object with status and timestamps
 * @returns true if runner has arrived
 */
async function hasRunnerArrivedFromOrder(order: Order | { status: OrderStatus; cash_withdrawn_at?: string | null; updated_at?: string; id?: string }): Promise<boolean> {
  // For now, we check order events for arrival confirmation
  // TODO: Add runner_arrived_at timestamp field for better performance
  if (!order.id || order.status !== "Pending Handoff") {
    return false;
  }

  try {
    const { supabase } = await import("@/db/supabase");
    const { data: events, error } = await supabase
      .from("order_events")
      .select("id, client_action_id, metadata")
      .eq("order_id", order.id)
      .eq("client_action_id", "runner_arrived")
      .limit(1);

    if (error) {
      // If order_events table doesn't exist, gracefully degrade
      if (import.meta.env.DEV && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        console.warn('[Customer Status] order_events table may not exist. Arrival tracking may not work.');
      }
      return false;
    }

    return events && events.length > 0;
  } catch (error) {
    console.error("Error checking runner arrival:", error);
    return false;
  }
}

/**
 * Convert internal status to customer-facing status
 * 
 * Internal statuses remain unchanged for system operations.
 * This function only affects what customers see in their UI.
 * 
 * Note: For Pending Handoff, this function returns "Heading Your Way" by default.
 * Components should use getCustomerFacingStatusWithArrival() to check for actual arrival.
 * 
 * @param internalStatus - Internal order status
 * @param order - Optional order object to check for runner arrival (for Pending Handoff)
 */
export function getCustomerFacingStatus(
  internalStatus: OrderStatus,
  order?: Order | { status: OrderStatus; cash_withdrawn_at?: string | null; updated_at?: string; id?: string }
): CustomerFacingStatus {
  switch (internalStatus) {
    case 'Pending':
      return {
        label: 'Request received',
        step: 'REQUESTED',
        description: "Request received. Benjamin's on it."
      };
    
    case 'Runner Accepted':
      return {
        label: 'Runner assigned',
        step: 'ASSIGNED',
        description: 'Your request has been assigned to a vetted Benjamin runner.'
      };
    
    case 'Runner at ATM':
      return {
        label: 'Preparing your cash',
        step: 'PREPARING',
        description: 'Your runner is preparing your cash.'
      };
    
    case 'Cash Withdrawn':
      return {
        label: 'Heading Your Way',
        step: 'ON_THE_WAY',
        description: 'Your runner has your cash and is heading your way.'
      };
    
    case 'Pending Handoff':
      // Default to "Heading Your Way" - components should check for arrival separately
      // This avoids async issues in synchronous status mapping
      return {
        label: 'Heading Your Way',
        step: 'ON_THE_WAY',
        description: 'Your runner has your cash and is heading your way.'
      };
    
    case 'Completed':
      return {
        label: 'OTP verified · Delivered',
        step: 'COMPLETED',
        description: 'Your one-time code was verified and the envelope was handed off at the selected address.'
      };
    
    case 'Cancelled':
    default:
      return {
        label: 'Canceled',
        step: 'CANCELED',
        description: 'This request has been canceled.'
      };
  }
}

/**
 * Get customer-friendly timeline steps
 * Simplified progression for customer tracking UI
 */
/**
 * Get customer-facing status with arrival check
 * 
 * This is an async version that checks for runner arrival.
 * Use this in components that need to show "Arrived" vs "Heading Your Way".
 * 
 * @param internalStatus - Internal order status
 * @param order - Order object to check for runner arrival
 * @returns Customer-facing status with arrival check
 */
export async function getCustomerFacingStatusWithArrival(
  internalStatus: OrderStatus,
  order: Order | { status: OrderStatus; cash_withdrawn_at?: string | null; updated_at?: string; id?: string }
): Promise<CustomerFacingStatus> {
  if (internalStatus === 'Pending Handoff') {
    const runnerArrived = await hasRunnerArrivedFromOrder(order);
    if (runnerArrived) {
      return {
        label: 'Runner has arrived',
        step: 'ARRIVED',
        description: 'Your runner has arrived. Please meet up and share your verification code to receive your cash.'
      };
    } else {
      return {
        label: 'Heading Your Way',
        step: 'ON_THE_WAY',
        description: 'Your runner has your cash and is heading your way.'
      };
    }
  }
  
  // For other statuses, use the synchronous version
  return getCustomerFacingStatus(internalStatus, order);
}

export const CUSTOMER_TIMELINE_STEPS = [
  {
    step: 'REQUESTED' as CustomerFacingStep,
    label: 'Request received',
    description: "Benjamin's on it"
  },
  {
    step: 'ASSIGNED' as CustomerFacingStep,
    label: 'Runner assigned',
    description: 'Vetted runner confirmed'
  },
  {
    step: 'PREPARING' as CustomerFacingStep,
    label: 'Preparing cash',
    description: 'Securing your funds'
  },
  {
    step: 'ON_THE_WAY' as CustomerFacingStep,
    label: 'On the way',
    description: 'En route to you'
  },
  {
    step: 'ARRIVED' as CustomerFacingStep,
    label: 'Runner has arrived',
    description: 'Ready for handoff'
  },
  {
    step: 'COMPLETED' as CustomerFacingStep,
    label: 'OTP verified · Delivered',
    description: 'Your one-time code was verified and the envelope was handed off at the selected address.'
  }
];
