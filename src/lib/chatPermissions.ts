/**
 * Chat Permissions
 * 
 * Determines when users can send messages in per-order chat.
 * Chat is enabled for active orders and disabled for completed/cancelled orders.
 */

import type { OrderStatus } from '@/types/types';

/**
 * Returns whether users can send messages for a given order status.
 * 
 * Chat is enabled only after cash withdrawal (when runner is on the way to customer)
 * and disabled once order is completed or cancelled.
 * 
 * Chat availability:
 * - "Cash Withdrawn": Runner has withdrawn cash, can message customer
 * - "Pending Handoff": Runner is on the way to customer, can message customer
 * - All other statuses: Chat disabled (before withdrawal or after completion)
 * 
 * @param status - Current order status
 * @returns true if messages can be sent, false otherwise
 */
export function canSendMessage(status: OrderStatus): boolean {
  switch (status) {
    case 'Cash Withdrawn':
    case 'Pending Handoff':
      return true;
    case 'Pending':
    case 'Runner Accepted':
    case 'Runner at ATM':
    case 'Completed':
    case 'Cancelled':
    default:
      return false;
  }
}

/**
 * Single source of truth for the chat closed message.
 * 
 * @returns Message to display when chat is closed
 */
export function getChatClosedMessage(): string {
  return 'This chat is closed for this delivery. For help, contact Benjamin Support.';
}

