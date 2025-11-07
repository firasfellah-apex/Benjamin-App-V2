/**
 * Safe Reveal Logic for Runner Information
 * 
 * Runner identity (photo, full name, live location) should only be revealed
 * after the runner has picked up the cash to ensure safety and privacy.
 * 
 * Status Flow:
 * 1. Pending
 * 2. Runner Accepted
 * 3. Runner at ATM
 * 4. Cash Withdrawn ← REVEAL POINT (runner has cash)
 * 5. Pending Handoff (en route to customer)
 * 6. Completed
 */

import { OrderStatus } from '@/types/types';

/**
 * Statuses where runner identity can be revealed
 * Only after cash is withdrawn should customer see runner photo and name
 */
const REVEAL_STATUSES: OrderStatus[] = [
  'Cash Withdrawn',
  'Pending Handoff',
  'Completed'
];

/**
 * Statuses where live route/map should be shown
 * Same as reveal statuses - only show live location after cash pickup
 */
const LIVE_ROUTE_STATUSES: OrderStatus[] = [
  'Cash Withdrawn',
  'Pending Handoff',
  'Completed'
];

/**
 * Check if runner identity (photo, full name) can be revealed
 * @param status Current order status
 * @returns true if runner info should be shown, false if should be blurred/hidden
 */
export function canRevealRunner(status: OrderStatus): boolean {
  return REVEAL_STATUSES.includes(status);
}

/**
 * Check if live route/map should be shown
 * @param status Current order status
 * @returns true if live map should be shown, false if should show placeholder
 */
export function canShowLiveRoute(status: OrderStatus): boolean {
  return LIVE_ROUTE_STATUSES.includes(status);
}

/**
 * Get reveal status message for UI
 * @param status Current order status
 * @returns User-friendly message explaining when info will be revealed
 */
export function getRevealMessage(status: OrderStatus): string {
  if (canRevealRunner(status)) {
    return 'Runner information is now visible';
  }
  
  return 'Runner photo and live location will be visible after cash pickup';
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
