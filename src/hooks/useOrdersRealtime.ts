/**
 * useOrdersRealtime Hook
 * 
 * Centralized realtime subscription hook for orders.
 * Provides filtered subscriptions based on user role and context.
 * 
 * Features:
 * - Customer: Subscribe to orders for a specific customer
 * - Runner: Subscribe to available orders (runner_id IS NULL) or assigned orders
 * - Admin: Subscribe to all orders
 * - Single order: Subscribe to a specific order by ID
 * 
 * Automatically handles cleanup on unmount.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';
import type { Order } from '@/types/types';

export type OrdersFilter =
  | { mode: 'customer'; customerId: string }
  | { mode: 'runner'; runnerId?: string; availableOnly?: boolean }
  | { mode: 'admin' }
  | { mode: 'single'; orderId: string };

// Supabase Realtime payload structure
type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, any>;
  old?: Record<string, any>;
  schema?: string;
  table?: string;
};

type UseOrdersRealtimeOptions = {
  filter: OrdersFilter;
  onInsert?: (order: Order) => void;
  onUpdate?: (order: Order, oldOrder?: Order) => void;
  onDelete?: (order: Order) => void;
  enabled?: boolean;
};

/**
 * Hook to subscribe to order changes via Supabase Realtime
 * 
 * @param options - Configuration for the subscription
 * @returns void (cleanup handled internally)
 */
export function useOrdersRealtime({
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseOrdersRealtimeOptions) {
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  
  // Keep callbacks up to date without re-subscribing
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = 
      filter.mode === 'single' 
        ? `order:${filter.orderId}`
        : filter.mode === 'customer'
        ? `customer-orders:${filter.customerId}`
        : filter.mode === 'runner'
        ? filter.availableOnly 
          ? 'runner-available-orders'
          : `runner-orders:${filter.runnerId || 'all'}`
        : 'admin-orders';

    // Build filter string based on mode
    // Note: Supabase Realtime filters use PostgREST syntax
    let filterString = '';
    if (filter.mode === 'single') {
      filterString = `id=eq.${filter.orderId}`;
    } else if (filter.mode === 'customer') {
      filterString = `customer_id=eq.${filter.customerId}`;
    } else if (filter.mode === 'runner') {
      if (filter.availableOnly) {
        // For available orders: status = 'Pending' AND runner_id IS NULL
        // Note: We can't use AND in a single filter, so we'll filter client-side
        // But we can still filter by status to reduce events
        filterString = `status=eq.Pending`;
      } else if (filter.runnerId) {
        filterString = `runner_id=eq.${filter.runnerId}`;
      }
    }
    // Admin mode: no filter (subscribe to all orders)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filterString && { filter: filterString }),
        },
        (payload: any) => {
          try {
            // Log raw payload for debugging
            console.log(`[Realtime] ${channelName} - Raw payload received:`, payload);
            
            // Supabase Realtime payload structure
            // The payload structure from Supabase is: { eventType, new, old, schema, table }
            const eventType = (payload.eventType || payload.type || payload.event) as 'INSERT' | 'UPDATE' | 'DELETE';
            
            // Guard against null/undefined payload.new and payload.old
            const newOrder = (payload.new && typeof payload.new === 'object') ? payload.new as Order : undefined;
            const oldOrder = (payload.old && typeof payload.old === 'object') ? payload.old as Order : undefined;

            console.log(`[Realtime] ${channelName} - Event received:`, {
              eventType,
              hasNew: !!newOrder,
              hasOld: !!oldOrder,
              orderId: newOrder?.id || oldOrder?.id,
              status: newOrder?.status || oldOrder?.status,
              runnerId: newOrder?.runner_id || oldOrder?.runner_id,
              payloadKeys: Object.keys(payload),
            });

            // Type guard: ensure we have an order
            if (!newOrder && !oldOrder) {
              console.warn(`[Realtime] ${channelName} - No order data in payload (both new and old are null/undefined)`);
              return;
            }

            // Apply filters based on mode
            if (filter.mode === 'customer') {
              if (newOrder && newOrder.customer_id !== filter.customerId) {
                console.log(`[Realtime] ${channelName} - Filtered out (wrong customer)`);
                return;
              }
              if (oldOrder && oldOrder.customer_id !== filter.customerId) {
                console.log(`[Realtime] ${channelName} - Filtered out (wrong customer)`);
                return;
              }
            }

            if (filter.mode === 'runner') {
              if (filter.availableOnly) {
                // Only show orders with status = 'Pending' and runner_id IS NULL
                // These are orders available for runners to accept
                // For INSERT events: check if newOrder is available
                if (eventType === 'INSERT' && newOrder) {
                  if (newOrder.status !== 'Pending' || newOrder.runner_id !== null) {
                    console.log(`[Realtime] ${channelName} - Filtered out INSERT (not available):`, {
                      status: newOrder.status,
                      runnerId: newOrder.runner_id,
                    });
                    return;
                  }
                  // This is a new available order - process it
                  console.log(`[Realtime] ${channelName} - New available order INSERT:`, newOrder.id);
                }
                // For UPDATE events: check if order became unavailable
                if (eventType === 'UPDATE' && newOrder) {
                  // If order is no longer available, we still want to process the update
                  // (to remove it from the list)
                  // But if it's still available, process it
                  const isAvailable = newOrder.status === 'Pending' && newOrder.runner_id === null;
                  const wasAvailable = oldOrder?.status === 'Pending' && oldOrder?.runner_id === null;
                  
                  if (!isAvailable && !wasAvailable) {
                    // Order was never available, filter out
                    console.log(`[Realtime] ${channelName} - Filtered out UPDATE (never available)`);
                    return;
                  }
                  // Process update (will be handled by callback to add/remove from list)
                  console.log(`[Realtime] ${channelName} - Available order UPDATE:`, {
                    orderId: newOrder.id,
                    isAvailable,
                    wasAvailable,
                  });
                }
                // For DELETE events: process if order was available
                if (eventType === 'DELETE' && oldOrder) {
                  if (oldOrder.status === 'Pending' && oldOrder.runner_id === null) {
                    console.log(`[Realtime] ${channelName} - Available order DELETE:`, oldOrder.id);
                    // Process delete (will be handled by callback to remove from list)
                  } else {
                    console.log(`[Realtime] ${channelName} - Filtered out DELETE (was not available)`);
                    return;
                  }
                }
              } else if (filter.runnerId) {
                // Show orders assigned to this specific runner
                if (newOrder && newOrder.runner_id !== filter.runnerId) {
                  console.log(`[Realtime] ${channelName} - Filtered out (wrong runner)`);
                  return;
                }
                if (oldOrder && oldOrder.runner_id !== filter.runnerId) {
                  console.log(`[Realtime] ${channelName} - Filtered out (wrong runner)`);
                  return;
                }
              }
            }

            // Call appropriate callback
            const callbacks = callbacksRef.current;

            if (eventType === 'INSERT' && newOrder && callbacks.onInsert) {
              console.log(`[Realtime] ${channelName} - Calling onInsert for order ${newOrder.id}`);
              callbacks.onInsert(newOrder);
            } else if (eventType === 'UPDATE' && newOrder && callbacks.onUpdate) {
              console.log(`[Realtime] ${channelName} - Calling onUpdate for order ${newOrder.id}`, {
                oldStatus: oldOrder?.status,
                newStatus: newOrder.status,
              });
              callbacks.onUpdate(newOrder, oldOrder);
            } else if (eventType === 'DELETE' && oldOrder && callbacks.onDelete) {
              console.log(`[Realtime] ${channelName} - Calling onDelete for order ${oldOrder.id}`);
              callbacks.onDelete(oldOrder);
            } else {
              console.warn(`[Realtime] ${channelName} - No callback for event type ${eventType}`, {
                hasOnInsert: !!callbacks.onInsert,
                hasOnUpdate: !!callbacks.onUpdate,
                hasOnDelete: !!callbacks.onDelete,
              });
            }
          } catch (error) {
            // Never throw from callback; fail silently with logs
            console.error(`[Realtime] ${channelName} - Error in callback handler:`, error);
            console.error(`[Realtime] ${channelName} - Payload that caused error:`, payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Subscribed to ${channelName}`, {
            filter: filterString || 'all orders',
            mode: filter.mode,
            table: 'orders',
            schema: 'public',
          });
          
          // Test: Log a message to confirm subscription is active
          console.log(`[Realtime] ${channelName} - Listening for events on orders table...`);
          console.log(`[Realtime] ${channelName} - To test: Create/update an order and watch for events here`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] ❌ Subscription error for ${channelName}:`, status);
          console.error(`[Realtime] ${channelName} - Make sure Realtime is enabled in Supabase Dashboard → Database → Replication`);
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] ${channelName} - Channel closed`);
        } else {
          console.log(`[Realtime] Subscription status for ${channelName}:`, status);
        }
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [
    enabled,
    filter.mode,
    ...(filter.mode === 'customer' ? [filter.customerId] : []),
    ...(filter.mode === 'runner' ? [filter.runnerId, filter.availableOnly] : []),
    ...(filter.mode === 'single' ? [filter.orderId] : []),
  ]);
}

/**
 * Hook to subscribe to a single order by ID
 * Convenience wrapper around useOrdersRealtime
 */
export function useOrderRealtime(
  orderId: string | null | undefined,
  callbacks: {
    onUpdate?: (order: Order, oldOrder?: Order) => void;
    onDelete?: (order: Order) => void;
  }
) {
  useOrdersRealtime({
    filter: { mode: 'single', orderId: orderId || '' },
    onUpdate: callbacks.onUpdate,
    onDelete: callbacks.onDelete,
    enabled: !!orderId,
  });
}

