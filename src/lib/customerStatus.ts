/**
 * Customer-Facing Status Mapping
 * 
 * Maps internal operational statuses to simplified, customer-friendly labels.
 * This provides a clean, reassuring experience while maintaining full granular
 * control internally for runners and admins.
 * 
 * Philosophy: We never lie; we just group technical steps under simpler labels.
 */

import type { OrderStatus } from '@/types/types';

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
 * Convert internal status to customer-facing status
 * 
 * Internal statuses remain unchanged for system operations.
 * This function only affects what customers see in their UI.
 */
export function getCustomerFacingStatus(internalStatus: OrderStatus): CustomerFacingStatus {
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
        label: 'On the way',
        step: 'ON_THE_WAY',
        description: 'Your runner has your cash and is on the way.'
      };
    
    case 'Pending Handoff':
      return {
        label: 'Arrived',
        step: 'ARRIVED',
        description: 'Your runner has arrived. Please meet to receive your cash.'
      };
    
    case 'Completed':
      return {
        label: 'Completed',
        step: 'COMPLETED',
        description: 'All set. Thanks for trusting Benjamin.'
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
    label: 'Arrived',
    description: 'Ready for handoff'
  },
  {
    step: 'COMPLETED' as CustomerFacingStep,
    label: 'Completed',
    description: 'Delivered safely'
  }
];
