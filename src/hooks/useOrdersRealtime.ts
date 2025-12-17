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
  const isSettingUpRef = useRef(false);
  const maxReconnectAttempts = 3; // Reduced from 5
  const reconnectDelay = 3000; // Increased from 2 seconds
  
  // Keep callbacks up to date without re-subscribing
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled) {
      // Clean up any existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      isSettingUpRef.current = false;
      return;
    }

    // Prevent duplicate setup during React strict mode
    if (isSettingUpRef.current) {
      return;
    }
    isSettingUpRef.current = true;

    // Use simpler channel names to avoid per-user channel conflicts
    const channelName = 
      filter.mode === 'single' 
        ? `order-${filter.orderId}`
        : filter.mode === 'customer'
        ? `customer-orders` // Simplified - no customer ID to reduce channel conflicts
        : filter.mode === 'runner'
        ? filter.availableOnly 
          ? 'runner-available-orders'
          : `runner-orders-${filter.runnerId || 'all'}`
        : 'admin-orders';

    // Build filter string - use client-side filtering for most modes to avoid CHANNEL_ERROR
    let filterString = '';
    
    if (filter.mode === 'runner' && filter.availableOnly) {
      // For available orders: filter by status to reduce event volume
      filterString = `status=eq.Pending`;
    }
    // All other modes: no server-side filter, use client-side filtering

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Small delay to avoid rapid channel creation during React strict mode
    const setupTimeout = setTimeout(() => {
      const channel = supabase.channel(channelName)
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
            const eventType = (payload.eventType || payload.type || payload.event) as 'INSERT' | 'UPDATE' | 'DELETE';
            const newOrder = (payload.new && typeof payload.new === 'object') ? payload.new as Order : undefined;
            const oldOrder = (payload.old && typeof payload.old === 'object') ? payload.old as Order : undefined;

            // Type guard: ensure we have an order
            if (!newOrder && !oldOrder) {
              return;
            }

            // Apply client-side filters based on mode
            if (filter.mode === 'single') {
              const targetOrderId = filter.orderId;
              if (newOrder && newOrder.id !== targetOrderId) return;
              if (oldOrder && oldOrder.id !== targetOrderId) return;
            } else if (filter.mode === 'customer') {
              if (newOrder && newOrder.customer_id !== filter.customerId) return;
              if (oldOrder && oldOrder.customer_id !== filter.customerId) return;
            }

            if (filter.mode === 'runner') {
              if (filter.availableOnly) {
                // Filter for available orders (Pending + no runner)
                if (eventType === 'INSERT' && newOrder) {
                  const isAvailable = newOrder.status === 'Pending' && (newOrder.runner_id === null || newOrder.runner_id === undefined);
                  if (!isAvailable) return;
                }
                if (eventType === 'UPDATE' && newOrder) {
                  const isAvailable = newOrder.status === 'Pending' && newOrder.runner_id === null;
                  const wasAvailable = oldOrder?.status === 'Pending' && oldOrder?.runner_id === null;
                  if (!isAvailable && !wasAvailable) return;
                }
                if (eventType === 'DELETE' && oldOrder) {
                  if (!(oldOrder.status === 'Pending' && oldOrder.runner_id === null)) return;
                }
              } else if (filter.runnerId) {
                if (newOrder && newOrder.runner_id !== filter.runnerId) return;
                if (oldOrder && oldOrder.runner_id !== filter.runnerId) return;
              }
            }

            // Call appropriate callback
            const callbacks = callbacksRef.current;

            if (eventType === 'INSERT' && newOrder && callbacks.onInsert) {
              try {
                callbacks.onInsert(newOrder);
              } catch (callbackError) {
                console.error(`[Realtime] Error in onInsert callback:`, callbackError);
              }
            } else if (eventType === 'UPDATE' && newOrder && callbacks.onUpdate) {
              callbacks.onUpdate(newOrder, oldOrder);
            } else if (eventType === 'DELETE' && oldOrder && callbacks.onDelete) {
              callbacks.onDelete(oldOrder);
            }
          } catch (error) {
            console.error(`[Realtime] Error in callback handler:`, error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Reset reconnect attempts on successful subscription
          reconnectAttemptsRef.current = 0;
          channelRef.current = channel;
          isSettingUpRef.current = false;
          
          // Minimal success log
          if (import.meta.env.DEV) {
            console.log(`[Realtime] ✅ Subscribed to ${channelName}`);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Log error only once per session, not every attempt
          if (reconnectAttemptsRef.current === 0 && import.meta.env.DEV) {
            console.warn(`[Realtime] Subscription issue for ${channelName}: ${status}. Will retry silently.`);
          }
          
          // Attempt reconnection if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
            reconnectAttemptsRef.current += 1;
            const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              isSettingUpRef.current = false;
            }, delay);
          } else {
            // Max attempts reached - fail silently, app will still work via polling/refetch
            isSettingUpRef.current = false;
          }
        } else if (status === 'CLOSED') {
          // Channel closed - attempt single reconnection silently
          if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              isSettingUpRef.current = false;
            }, reconnectDelay);
          } else {
            isSettingUpRef.current = false;
          }
        }
      });
    
      // Store channel reference
      channelRef.current = channel;
    }, 100); // Small delay to avoid React strict mode double-invoke issues

    return () => {
      // Clear setup timeout
      clearTimeout(setupTimeout);
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Reset state
      reconnectAttemptsRef.current = 0;
      isSettingUpRef.current = false;
      
      // Remove channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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

