import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get unread message count for an order
 * Unread = messages from other person that haven't been marked as read
 * 
 * @param orderId - Order ID
 */
export function useUnreadMessages(orderId: string | null) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // Unique ID per hook instance to avoid channel name collisions
  const instanceIdRef = useRef<string>(`${Math.random().toString(36).substring(2, 9)}`);
  const realtimeFailedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAppActiveRef = useRef(true);

  // Helper to clear polling interval
  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!orderId || !user) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    realtimeFailedRef.current = false;
    isAppActiveRef.current = true;

    // Load unread count
    const loadUnreadCount = async () => {
      if (cancelled) return;
      try {
        // Get all messages for this order
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, sender_id')
          .eq('order_id', orderId);

        if (messagesError) {
          // Gracefully handle missing table
          if (messagesError.code === '42P01' || messagesError.code === 'PGRST116') {
            setUnreadCount(0);
            return;
          }
          console.error('[UnreadMessages] Error loading messages:', messagesError);
          setUnreadCount(0);
          return;
        }

        if (cancelled) return;

        // Filter to messages from other people
        const otherPersonMessages = (messages || []).filter((msg) => msg.sender_id !== user.id);
        
        if (otherPersonMessages.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Get read status for these messages
        const messageIds = otherPersonMessages.map(m => m.id);
        try {
          const { data: reads, error: readsError } = await supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
            .in('message_id', messageIds);

          if (readsError) {
            // Gracefully handle missing table
            if (readsError.code === '42P01' || readsError.message?.includes('does not exist')) {
              // If table doesn't exist, count all as unread (backward compatibility)
              setUnreadCount(otherPersonMessages.length);
              return;
            }
            console.error('[UnreadMessages] Error loading read status:', readsError);
            setUnreadCount(0);
            return;
          }

          const readMessageIds = new Set((reads || []).map(r => r.message_id));
          const unread = otherPersonMessages.filter(msg => !readMessageIds.has(msg.id)).length;
          setUnreadCount(unread);
        } catch (readsError: any) {
          // Gracefully handle missing table
          if (readsError.code === '42P01' || readsError.message?.includes('does not exist')) {
            setUnreadCount(otherPersonMessages.length);
          } else {
            console.error('[UnreadMessages] Unexpected error:', readsError);
            setUnreadCount(0);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[UnreadMessages] Unexpected error:', error);
          setUnreadCount(0);
        }
      }
    };

    loadUnreadCount();

    // Subscribe to new messages and read receipts
    // Use unique channel name per hook instance to avoid cleanup conflicts
    const channel = supabase
      .channel(`unread-messages:${orderId}:${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (cancelled) return;
          const msg = payload.new as { sender_id: string };
          // Only reload if message is from someone else (not from current user)
          if (msg.sender_id !== user.id) {
            loadUnreadCount();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!cancelled) loadUnreadCount();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[UnreadMessages] Subscribed for order', orderId);
          realtimeFailedRef.current = false;
          // Clear polling if realtime is working
          clearPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Log error only once per session to avoid spam
          if (!realtimeFailedRef.current && import.meta.env.DEV) {
            console.warn(`[UnreadMessages] Channel error for order ${orderId}: ${status}. Falling back to polling every 5 seconds.`);
          }
          realtimeFailedRef.current = true;
          
          // Fallback: poll unread counts every 5 seconds if realtime fails (only if app is active)
          if (isAppActiveRef.current && !pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(() => {
              if (!cancelled && isAppActiveRef.current) {
                loadUnreadCount();
              } else {
                clearPolling();
              }
            }, 5000);
          }
        }
      });

    // Listen for app state changes (background/foreground) on native platforms
    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appStateListener = App.addListener('appStateChange', ({ isActive }) => {
        isAppActiveRef.current = isActive;
        if (isActive) {
          // App came to foreground - restart polling if realtime failed
          if (realtimeFailedRef.current && !pollIntervalRef.current && !cancelled) {
            pollIntervalRef.current = setInterval(() => {
              if (!cancelled && isAppActiveRef.current) {
                loadUnreadCount();
              } else {
                clearPolling();
              }
            }, 5000);
          }
        } else {
          // App went to background - stop polling to save battery
          clearPolling();
        }
      });
    }

    return () => {
      cancelled = true;
      clearPolling();
      supabase.removeChannel(channel);
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [orderId, user?.id]);

  return unreadCount;
}

