/**
 * Event-driven order notifications
 * 
 * This module provides helpers to emit order events that trigger push notifications.
 * Events are stored in order_events table and then sent via Edge Function.
 */

import { supabase } from './supabase';

export type OrderEventType =
  | 'order_created'
  | 'runner_assigned'
  | 'runner_en_route'
  | 'runner_arrived'
  | 'otp_verified'
  | 'handoff_completed'
  | 'order_cancelled'
  | 'refund_processing'
  | 'refund_succeeded'
  | 'refund_failed';

export interface OrderEventPayload {
  [key: string]: any;
  runner_id?: string;
  runner_name?: string;
  eta_seconds?: number;
  arrived_at?: string;
  verified_at?: string;
  completed_at?: string;
  cancelled_by?: 'customer' | 'runner' | 'admin';
  refund_job_id?: string;
  provider_ref?: string;
  error?: string;
}

/**
 * Emit an order event (stores in DB and triggers push notification)
 * 
 * This is the "Option A" approach: explicit event emission from app code.
 * 
 * @param orderId - The order ID
 * @param eventType - The event type
 * @param payload - Event-specific payload data
 * @returns The created order_event record
 */
export async function emitOrderEvent(
  orderId: string,
  eventType: OrderEventType,
  payload: OrderEventPayload = {}
): Promise<{ success: boolean; event_id?: string; error?: string }> {
  try {
    // Insert event into order_events table
    const { data: event, error: insertError } = await supabase
      .from('order_events')
      .insert({
        order_id: orderId,
        event_type: eventType,
        payload: payload,
        // Keep FSM fields null for event-driven events
        from_status: null,
        to_status: null,
        actor_id: null,
        actor_role: null,
        client_action_id: null,
        metadata: {}
      })
      .select('id')
      .single();

    if (insertError || !event) {
      console.error('[emitOrderEvent] Failed to insert event:', insertError);
      return { success: false, error: insertError?.message || 'Failed to insert event' };
    }

    // Trigger push notification via Edge Function (fire and forget)
    supabase.functions.invoke('notify-order-event', {
      body: {
        order_event_id: event.id
      }
    }).then(({ error }) => {
      if (error) {
        console.error('[emitOrderEvent] Failed to trigger notification:', error);
        // Don't throw - event is already stored, notification failure is non-critical
      } else {
        console.log('[emitOrderEvent] ✅ Notification triggered for event:', event.id);
      }
    }).catch((err) => {
      console.error('[emitOrderEvent] Exception triggering notification:', err);
      // Don't throw - event is already stored
    });

    return { success: true, event_id: event.id };
  } catch (error: any) {
    console.error('[emitOrderEvent] Exception:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Helper: Emit order_created event
 */
export async function emitOrderCreated(orderId: string): Promise<void> {
  await emitOrderEvent(orderId, 'order_created', {});
}

/**
 * Helper: Emit runner_assigned event
 */
export async function emitRunnerAssigned(
  orderId: string,
  runnerId: string,
  runnerName?: string
): Promise<void> {
  await emitOrderEvent(orderId, 'runner_assigned', {
    runner_id: runnerId,
    runner_name: runnerName
  });
}

/**
 * Helper: Emit runner_en_route event
 */
export async function emitRunnerEnRoute(
  orderId: string,
  etaSeconds?: number
): Promise<void> {
  await emitOrderEvent(orderId, 'runner_en_route', {
    eta_seconds: etaSeconds
  });
}

/**
 * Helper: Emit runner_arrived event
 */
export async function emitRunnerArrived(orderId: string): Promise<void> {
  await emitOrderEvent(orderId, 'runner_arrived', {
    arrived_at: new Date().toISOString()
  });
}

/**
 * Helper: Emit otp_verified event
 */
export async function emitOtpVerified(orderId: string): Promise<void> {
  await emitOrderEvent(orderId, 'otp_verified', {
    verified_at: new Date().toISOString()
  });
}

/**
 * Helper: Emit handoff_completed event
 */
export async function emitHandoffCompleted(orderId: string): Promise<void> {
  await emitOrderEvent(orderId, 'handoff_completed', {
    completed_at: new Date().toISOString()
  });
}

/**
 * Helper: Emit order_cancelled event
 */
export async function emitOrderCancelled(
  orderId: string,
  cancelledBy: 'customer' | 'runner' | 'admin'
): Promise<void> {
  await emitOrderEvent(orderId, 'order_cancelled', {
    cancelled_by: cancelledBy
  });
}

/**
 * Helper: Emit refund_processing event
 */
export async function emitRefundProcessing(orderId: string, refundJobId: string): Promise<void> {
  await emitOrderEvent(orderId, 'refund_processing', {
    refund_job_id: refundJobId
  });
}

/**
 * Helper: Emit refund_succeeded event
 */
export async function emitRefundSucceeded(
  orderId: string,
  refundJobId: string,
  providerRef?: string
): Promise<void> {
  await emitOrderEvent(orderId, 'refund_succeeded', {
    refund_job_id: refundJobId,
    provider_ref: providerRef
  });
}

/**
 * Helper: Emit refund_failed event
 */
export async function emitRefundFailed(
  orderId: string,
  refundJobId: string,
  error: string
): Promise<void> {
  await emitOrderEvent(orderId, 'refund_failed', {
    refund_job_id: refundJobId,
    error
  });
}

