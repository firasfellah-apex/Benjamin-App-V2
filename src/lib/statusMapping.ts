/**
 * Status Mapping Utility
 * 
 * Maps between internal database statuses and standardized internal statuses.
 * This provides a single source of truth for status handling across the app.
 * 
 * Internal Statuses (what we use in code):
 * - pending
 * - runner_accepted
 * - runner_at_atm
 * - cash_withdrawn
 * - pending_handoff
 * - completed
 * - canceled
 * 
 * Database Statuses (what Supabase stores):
 * - 'Pending'
 * - 'Runner Accepted'
 * - 'Runner at ATM'
 * - 'Cash Withdrawn'
 * - 'Pending Handoff'
 * - 'Completed'
 * - 'Cancelled'
 */

export type InternalStatus = 
  | 'pending'
  | 'runner_accepted'
  | 'runner_at_atm'
  | 'cash_withdrawn'
  | 'pending_handoff'
  | 'completed'
  | 'canceled';

export type DatabaseStatus = 
  | 'Pending'
  | 'Runner Accepted'
  | 'Runner at ATM'
  | 'Cash Withdrawn'
  | 'Pending Handoff'
  | 'Completed'
  | 'Cancelled';

/**
 * Map database status to internal status
 */
export function dbToInternalStatus(dbStatus: DatabaseStatus): InternalStatus {
  const mapping: Record<DatabaseStatus, InternalStatus> = {
    'Pending': 'pending',
    'Runner Accepted': 'runner_accepted',
    'Runner at ATM': 'runner_at_atm',
    'Cash Withdrawn': 'cash_withdrawn',
    'Pending Handoff': 'pending_handoff',
    'Completed': 'completed',
    'Cancelled': 'canceled',
  };
  
  return mapping[dbStatus] || 'pending';
}

/**
 * Map internal status to database status
 */
export function internalToDbStatus(internalStatus: InternalStatus): DatabaseStatus {
  const mapping: Record<InternalStatus, DatabaseStatus> = {
    'pending': 'Pending',
    'runner_accepted': 'Runner Accepted',
    'runner_at_atm': 'Runner at ATM',
    'cash_withdrawn': 'Cash Withdrawn',
    'pending_handoff': 'Pending Handoff',
    'completed': 'Completed',
    'canceled': 'Cancelled',
  };
  
  return mapping[internalStatus] || 'Pending';
}

/**
 * Check if status is a final state
 */
export function isFinalStatus(status: InternalStatus | DatabaseStatus): boolean {
  const normalized = typeof status === 'string' && status.includes(' ') 
    ? dbToInternalStatus(status as DatabaseStatus)
    : status as InternalStatus;
  
  return normalized === 'completed' || normalized === 'canceled';
}

/**
 * Check if status is active (not final)
 */
export function isActiveStatus(status: InternalStatus | DatabaseStatus): boolean {
  return !isFinalStatus(status);
}

