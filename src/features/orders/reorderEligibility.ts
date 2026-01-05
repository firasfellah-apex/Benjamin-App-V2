/**
 * Reorder Eligibility Validation
 * 
 * Validates whether a customer can reorder from a previous order.
 * Checks for linked bank account, delivery address availability, and order status.
 */

import type { OrderWithDetails } from '@/types/types';
import type { Profile } from '@/types/types';
import type { CustomerAddress } from '@/types/types';

export interface ReorderEligibilityResult {
  ok: boolean;
  reason?: 'missing_bank' | 'missing_address' | 'blocked_order' | 'runner_disabled';
  message?: string;
}

export interface ReorderEligibilityOptions {
  profile: Profile | null;
  addresses: CustomerAddress[];
  previousOrder: OrderWithDetails;
  bankAccounts?: Array<{ id: string }>; // Bank accounts from bank_accounts table
}

/**
 * Validates if a customer is eligible to reorder from a previous order
 * 
 * Hard checks (block reorder if failed):
 * - hasLinkedBank: Customer must have at least one active linked bank account
 * - hasDeliveryAddress: The address referenced by the previous order must still exist
 * - orderNotCancelledOrFlagged: Previous order must not be in a blocked/flagged state
 * 
 * Soft checks (log only, don't block):
 * - runnerStatusOk: Log if previous runner is disabled (for monitoring)
 */
export function validateReorderEligibility(
  options: ReorderEligibilityOptions
): ReorderEligibilityResult {
  const { profile, addresses, previousOrder, bankAccounts = [] } = options;

  // Hard check 1: Customer must have a linked bank account
  // Check bank_accounts table (new approach) or fallback to plaid_item_id (legacy)
  const hasLinkedBank = bankAccounts.length > 0 || !!profile?.plaid_item_id;
  if (!hasLinkedBank) {
    return {
      ok: false,
      reason: 'missing_bank',
      message: "Your last order used a bank account that's no longer linked. Please update your bank and try again.",
    };
  }

  // Hard check 2: Delivery address must still exist
  let hasDeliveryAddress = false;
  if (previousOrder.address_id) {
    // Check if the address_id from the order still exists in customer's addresses
    hasDeliveryAddress = addresses.some(addr => addr.id === previousOrder.address_id);
  } else if (previousOrder.address_snapshot) {
    // If no address_id but we have a snapshot, we can't verify it exists
    // For now, we'll allow it (address might have been deleted but snapshot exists)
    // This is a softer check - we could make it stricter later
    hasDeliveryAddress = true;
  } else {
    // No address_id and no snapshot - this shouldn't happen but block reorder
    hasDeliveryAddress = false;
  }

  if (!hasDeliveryAddress) {
    return {
      ok: false,
      reason: 'missing_address',
      message: "The address from your last order is no longer available. Please add or select a delivery address to reorder.",
    };
  }

  // Hard check 3: Order must not be flagged for fraud or other serious issues
  // NOTE: We allow cancelled orders to be reordered from since we're creating a NEW order,
  // not reusing the cancelled one. Cancellation is a normal part of the flow.
  // Only block if the order has been flagged for fraud or other serious issues.
  // For now, we don't have fraud flags in the order data, so we allow all orders.
  // In the future, you could add checks like:
  // - previousOrder.fraud_flag
  // - previousOrder.reported_for_fraud
  // - previousOrder.blocked_by_admin
  // etc.
  const orderNotFlagged = true; // All orders are allowed for now

  if (!orderNotFlagged) {
    return {
      ok: false,
      reason: 'blocked_order',
      message: "That order can't be reused. Please start a new request instead.",
    };
  }

  // Soft check: Runner status (log only, don't block)
  const runner = previousOrder.runner;
  if (runner) {
    // Check if runner is disabled (if we have that info)
    // For now, we don't have runner status in the order data
    // This is a placeholder for future monitoring
    // You could check: runner.is_disabled, runner.is_active, etc.
    // if (runner.is_disabled) {
    //   console.warn('[ReorderEligibility] Previous runner is disabled', {
    //     orderId: previousOrder.id,
    //     runnerId: runner.id,
    //   });
    // }
  }

  // All checks passed
  return {
    ok: true,
  };
}

