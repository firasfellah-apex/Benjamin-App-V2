/**
 * Order Status Helpers
 * 
 * Centralized definitions for order statuses and terminal states.
 */

import type { OrderStatus } from '@/types/types';

/**
 * Terminal statuses that indicate an order is in a final state.
 * Orders in these statuses are considered "completed" and don't block runner actions.
 */
export const RUNNER_TERMINAL_STATUSES: OrderStatus[] = ['Completed', 'Cancelled'];

/**
 * Check if an order status is terminal (final state).
 * 
 * @param status - Order status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return RUNNER_TERMINAL_STATUSES.includes(status);
}

/**
 * Check if an order is active (not in terminal state).
 * 
 * @param status - Order status to check
 * @returns true if order is active
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return !isTerminalStatus(status);
}









