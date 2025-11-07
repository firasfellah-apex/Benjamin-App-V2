/**
 * Runner Identity Reveal Logic
 * 
 * Controls when and how runner information is revealed to customers.
 * This protects runner safety while maintaining customer trust.
 * 
 * Key principle: No premature location/face reveal until cash is secured.
 * 
 * Status Flow:
 * 1. Pending → No runner info
 * 2. Runner Accepted → First name + blurred avatar, no location
 * 3. Runner at ATM → Still blurred, no location
 * 4. Cash Withdrawn → TRUST SWITCH: Unblur avatar, show full name, start live map
 * 5. Pending Handoff → Continue live tracking
 * 6. Completed → Map stops, confirmation
 */

import type { OrderStatus } from '@/types/types';

/**
 * Can we show ANY runner information?
 * 
 * Returns true once a runner has accepted the job.
 * Before this, customers see no runner details at all.
 */
export function canRevealRunnerIdentity(status: OrderStatus): boolean {
  return [
    'Runner Accepted',
    'Runner at ATM',
    'Cash Withdrawn',
    'Pending Handoff',
    'Completed'
  ].includes(status);
}

/**
 * Should we blur the runner's avatar?
 * 
 * Returns true until cash is actually picked up.
 * This protects runner identity during the ATM phase.
 * 
 * Timeline:
 * - Accepted → Blurred (show first name only)
 * - At ATM → Still blurred
 * - Cash Withdrawn → Unblurred (show full name + clear photo)
 */
export function shouldBlurRunnerAvatar(status: OrderStatus): boolean {
  return [
    'Runner Accepted',
    'Runner at ATM'
  ].includes(status);
}

/**
 * Can we show live location tracking?
 * 
 * Returns true only after runner has confirmed cash pickup.
 * This is the "trust switch" moment.
 * 
 * Before this: No map, no location data.
 * After this: Full live tracking from runner → customer.
 */
export function canShowLiveLocation(status: OrderStatus): boolean {
  return [
    'Cash Withdrawn',
    'Pending Handoff'
  ].includes(status);
}

/**
 * Get runner display name based on status
 * 
 * Returns appropriate name format:
 * - Before cash pickup: First name only
 * - After cash pickup: Full name
 */
export function getRunnerDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  status: OrderStatus
): string {
  if (!firstName) return 'Runner';
  
  // Show full name after cash is picked up
  if (canShowLiveLocation(status) && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  // Show first name only during preparation phase
  return firstName;
}

/**
 * Safety microcopy for customer tracking screen
 * 
 * Explains why information is revealed progressively.
 */
export const SAFETY_MICROCOPY = {
  beforeCashPickup: "For everyone's safety, runner details and live tracking appear only once your cash is secured.",
  duringDelivery: "Your runner's location is being tracked for your safety and theirs.",
  afterDelivery: "Delivery complete. Location tracking has ended."
};

// Legacy compatibility exports
export const canRevealRunner = canShowLiveLocation;
export const canShowLiveRoute = canShowLiveLocation;

/**
 * Get reveal status message for UI
 * @param status Current order status
 * @returns User-friendly message explaining when info will be revealed
 */
export function getRevealMessage(status: OrderStatus): string {
  if (canShowLiveLocation(status)) {
    return SAFETY_MICROCOPY.duringDelivery;
  }
  
  if (canRevealRunnerIdentity(status)) {
    return SAFETY_MICROCOPY.beforeCashPickup;
  }
  
  return 'Runner information will appear once assigned.';
}

/**
 * Check if order is in a final state (completed or cancelled)
 * @param status Current order status
 * @returns true if order is in final state
 */
export function isOrderFinal(status: OrderStatus): boolean {
  return status === 'Completed' || status === 'Cancelled';
}

/**
 * Check if customer can cancel the order
 * Customers can cancel before runner arrives at ATM
 * @param status Current order status
 * @returns true if cancellation is allowed
 */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === 'Pending' || status === 'Runner Accepted';
}
