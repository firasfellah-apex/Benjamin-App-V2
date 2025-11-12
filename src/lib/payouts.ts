/**
 * Payout Calculation Helpers
 * 
 * Single source of truth for runner payout calculations.
 * This ensures consistency across the application.
 */

import type { Order } from '@/types/types';

/**
 * Calculate runner payout for a single order
 * 
 * @param order - The order object
 * @returns The payout amount for the runner
 */
export function getRunnerPayout(order: Order): number {
  // Runner earns the delivery_fee from the order
  // This is already calculated and stored on the order
  return order.delivery_fee || 0;
}

/**
 * Calculate total earnings from a list of orders
 * 
 * @param orders - Array of orders
 * @returns Total payout amount
 */
export function calculateTotalEarnings(orders: Order[]): number {
  return orders.reduce((total, order) => total + getRunnerPayout(order), 0);
}

/**
 * Calculate monthly earnings from completed orders
 * 
 * @param orders - Array of completed orders
 * @param month - Month (0-11, where 0 = January)
 * @param year - Year (e.g., 2025)
 * @returns Total earnings for the specified month
 */
export function calculateMonthlyEarnings(
  orders: Order[],
  month?: number,
  year?: number
): number {
  const now = new Date();
  const targetMonth = month ?? now.getMonth();
  const targetYear = year ?? now.getFullYear();

  const monthlyOrders = orders.filter((order) => {
    if (order.status !== 'Completed') return false;
    
    // Use handoff_completed_at if available, otherwise use updated_at
    const completedDate = order.handoff_completed_at 
      ? new Date(order.handoff_completed_at)
      : new Date(order.updated_at);
    
    return (
      completedDate.getMonth() === targetMonth &&
      completedDate.getFullYear() === targetYear
    );
  });

  return calculateTotalEarnings(monthlyOrders);
}

