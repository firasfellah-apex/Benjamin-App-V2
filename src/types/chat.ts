/**
 * Chat Types
 * 
 * Types for per-order chat messages between customers, runners, and admins.
 */

export type MessageRole = 'customer' | 'runner' | 'admin';

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: MessageRole;
  body: string;
  created_at: string;
}

