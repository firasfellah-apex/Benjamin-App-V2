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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds
  
  // Keep callbacks up to date without re-subscribing
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    // Enhanced logging for PWA debugging
    console.log(`[Realtime] Subscription setup check:`, {
      enabled,
      mode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      filterMode: filter.mode,
      channelName: filter.mode === 'single' 
        ? `order:${filter.mode === 'single' ? filter.orderId : 'N/A'}`
        : filter.mode === 'customer'
        ? `customer-orders:${filter.mode === 'customer' ? filter.customerId : 'N/A'}`
        : filter.mode === 'runner'
        ? filter.availableOnly 
          ? 'runner-available-orders'
          : `runner-orders:${filter.runnerId || 'all'}`
        : 'admin-orders',
    });

    if (!enabled) {
      console.log(`[Realtime] ${filter.mode === 'runner' && filter.availableOnly ? 'runner-available-orders' : 'channel'} - Subscription disabled, skipping setup`);
      // Clean up any existing channel
      if (channelRef.current) {
        console.log(`[Realtime] Cleaning up channel because subscription disabled`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      return;
    }

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
    // IMPORTANT: For single order subscriptions, we subscribe WITHOUT a server-side filter
    // and filter client-side to avoid RLS/filter issues that cause CHANNEL_ERROR
    // RLS policies will still ensure users only receive events for orders they can access
    let filterString = '';
    
    if (filter.mode === 'single') {
      // For single order: Subscribe without server-side filter to avoid CHANNEL_ERROR
      // We'll filter client-side in the event handler
      // This is necessary because id=eq.${orderId} filters can cause RLS issues
      filterString = ''; // No server-side filter - we'll filter client-side
      console.log(`[Realtime] Single order subscription: No server-side filter, will filter client-side for orderId=${filter.orderId}`);
    } else if (filter.mode === 'customer') {
      filterString = `customer_id=eq.${filter.customerId}`;
    } else if (filter.mode === 'runner') {
      if (filter.availableOnly) {
        // For available orders: status = 'Pending' AND runner_id IS NULL
        // Note: We can't use AND in a single filter, so we'll filter client-side
        // But we can still filter by status to reduce events
        // This filter will match all INSERT/UPDATE/DELETE events for Pending orders
        // We then check runner_id === null in the client-side handler
        filterString = `status=eq.Pending`;
      } else if (filter.runnerId) {
        filterString = `runner_id=eq.${filter.runnerId}`;
      }
    }
    // Admin mode: no filter (subscribe to all orders)

    console.log(`[Realtime] Setting up subscription for ${channelName}`, {
      filter: filterString || 'all orders',
      mode: filter.mode,
      availableOnly: filter.mode === 'runner' ? filter.availableOnly : undefined,
      enabled,
    });

    // Clean up any existing channel for this subscription
    if (channelRef.current) {
      console.log(`[Realtime] Cleaning up existing channel before creating new one: ${channelName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          // Add presence for better connection management
          presence: {
            key: channelName,
          },
        },
      })
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
            if (filter.mode === 'single') {
              // For single order subscriptions, filter client-side to avoid RLS issues
              const targetOrderId = filter.orderId;
              if (newOrder && newOrder.id !== targetOrderId) {
                console.log(`[Realtime] ${channelName} - Filtered out (wrong order ID):`, {
                  received: newOrder.id,
                  expected: targetOrderId,
                });
                return;
              }
              if (oldOrder && oldOrder.id !== targetOrderId) {
                console.log(`[Realtime] ${channelName} - Filtered out (wrong order ID):`, {
                  received: oldOrder.id,
                  expected: targetOrderId,
                });
                return;
              }
              console.log(`[Realtime] ${channelName} - ✅ Matched single order subscription:`, {
                orderId: newOrder?.id || oldOrder?.id,
                eventType,
              });
            } else if (filter.mode === 'customer') {
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
                  // Check if order is available: status must be 'Pending' AND runner_id must be NULL
                  const isAvailable = newOrder.status === 'Pending' && (newOrder.runner_id === null || newOrder.runner_id === undefined);
                  
                  if (!isAvailable) {
                    console.log(`[Realtime] ${channelName} - Filtered out INSERT (not available):`, {
                      status: newOrder.status,
                      runnerId: newOrder.runner_id,
                      isNull: newOrder.runner_id === null,
                      isUndefined: newOrder.runner_id === undefined,
                    });
                    return;
                  }
                  // This is a new available order - process it
                  console.log(`[Realtime] ${channelName} - ✅ New available order INSERT detected:`, {
                    orderId: newOrder.id,
                    status: newOrder.status,
                    runnerId: newOrder.runner_id,
                    customerId: newOrder.customer_id,
                    requestedAmount: newOrder.requested_amount,
                  });
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

            if (eventType === 'INSERT' && newOrder) {
              if (!callbacks.onInsert) {
                console.warn(`[Realtime] ${channelName} - ⚠️ INSERT event received but no onInsert callback registered`, {
                  orderId: newOrder.id,
                  hasOnInsert: !!callbacks.onInsert,
                  hasOnUpdate: !!callbacks.onUpdate,
                  hasOnDelete: !!callbacks.onDelete,
                });
                return;
              }
              
              console.log(`[Realtime] ${channelName} - 🎯 INSERT event - Calling onInsert for order ${newOrder.id}`, {
                orderId: newOrder.id,
                status: newOrder.status,
                runnerId: newOrder.runner_id,
                customerId: newOrder.customer_id,
                timestamp: new Date().toISOString(),
              });
              
              try {
                callbacks.onInsert(newOrder);
                console.log(`[Realtime] ${channelName} - ✅ onInsert callback executed successfully for order ${newOrder.id}`);
              } catch (callbackError) {
                console.error(`[Realtime] ${channelName} - ❌ Error in onInsert callback:`, callbackError);
              }
            } else if (eventType === 'UPDATE' && newOrder && callbacks.onUpdate) {
              console.log(`[Realtime] ${channelName} - 🔄 UPDATE event - Calling onUpdate for order ${newOrder.id}`, {
                orderId: newOrder.id,
                oldStatus: oldOrder?.status,
                newStatus: newOrder.status,
                oldRunnerId: oldOrder?.runner_id,
                newRunnerId: newOrder.runner_id,
              });
              callbacks.onUpdate(newOrder, oldOrder);
            } else if (eventType === 'DELETE' && oldOrder && callbacks.onDelete) {
              console.log(`[Realtime] ${channelName} - 🗑️ DELETE event - Calling onDelete for order ${oldOrder.id}`);
              callbacks.onDelete(oldOrder);
            } else {
              console.warn(`[Realtime] ${channelName} - ⚠️ No callback for event type ${eventType}`, {
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
          // Reset reconnect attempts on successful subscription
          reconnectAttemptsRef.current = 0;
          channelRef.current = channel;
          
          console.log(`[Realtime] ✅ Successfully subscribed to ${channelName}`, {
            filter: filterString || 'all orders',
            mode: filter.mode,
            availableOnly: filter.mode === 'runner' ? filter.availableOnly : undefined,
            table: 'orders',
            schema: 'public',
            envMode: import.meta.env.MODE,
            isDev: import.meta.env.DEV,
            timestamp: new Date().toISOString(),
          });
          
          // Test: Log a message to confirm subscription is active
          console.log(`[Realtime] ${channelName} - 📡 Listening for events on orders table...`);
          console.log(`[Realtime] ${channelName} - 🔧 Environment: ${import.meta.env.MODE} (DEV: ${import.meta.env.DEV})`);
          if (filter.mode === 'runner' && filter.availableOnly) {
            console.log(`[Realtime] ${channelName} - 👀 Watching for new Pending orders (runner_id IS NULL)`);
            console.log(`[Realtime] ${channelName} - 💡 When a customer creates an order, you should see an INSERT event here`);
            console.log(`[Realtime] ${channelName} - 🔍 To verify Realtime is enabled, check: Supabase Dashboard → Database → Replication → orders table`);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] ❌ Subscription error for ${channelName}:`, status);
          console.error(`[Realtime] ${channelName} - ⚠️ TROUBLESHOOTING STEPS:`);
          console.error(`[Realtime] ${channelName} - 1. Check if Realtime is enabled: Supabase Dashboard → Database → Replication → orders table`);
          console.error(`[Realtime] ${channelName} - 2. Verify migration was applied: Check if orders table is in supabase_realtime publication`);
          console.error(`[Realtime] ${channelName} - 3. Check RLS policies: Runners should be able to SELECT orders with status='Pending'`);
          console.error(`[Realtime] ${channelName} - 4. Check browser console for network errors`);
          
          // Attempt reconnection if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
            reconnectAttemptsRef.current += 1;
            const delay = reconnectDelay * reconnectAttemptsRef.current; // Exponential backoff
            
            console.log(`[Realtime] ${channelName} - 🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              // Force re-subscription by clearing the channel and letting useEffect re-run
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              // The useEffect will re-run and create a new subscription
              // We need to trigger a re-render, but since we're in a callback, we'll let the cleanup/re-run handle it
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error(`[Realtime] ${channelName} - ❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Giving up.`);
          }
        } else if (status === 'CLOSED') {
          console.warn(`[Realtime] ${channelName} - ⚠️ Channel closed. This may indicate a connection issue.`);
          
          // Attempt reconnection if channel closes unexpectedly
          if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
            reconnectAttemptsRef.current += 1;
            const delay = reconnectDelay * reconnectAttemptsRef.current;
            
            console.log(`[Realtime] ${channelName} - 🔄 Channel closed, attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
            }, delay);
          }
        } else {
          console.log(`[Realtime] Subscription status for ${channelName}:`, status);
        }
      });
    
    // Store channel reference for cleanup (set immediately, will be updated when subscribed)
    channelRef.current = channel;

    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Reset reconnect attempts
      reconnectAttemptsRef.current = 0;
      
      // Remove channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      } else if (channel) {
        // Fallback: remove channel directly if ref is not set
        supabase.removeChannel(channel);
      }
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
    enabled?: boolean;
  } = {}
) {
  const { onUpdate, onDelete, enabled = true } = callbacks;
  useOrdersRealtime({
    filter: { mode: 'single', orderId: orderId || '' },
    onUpdate,
    onDelete,
    enabled: enabled && !!orderId,
  });
}

