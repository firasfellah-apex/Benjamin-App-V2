import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import type { OrderMessage, MessageRole } from '@/types/chat';
import { canSendMessage } from '@/lib/chatPermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStatus } from '@/types/types';

interface UseOrderChatOptions {
  orderId: string;
  orderStatus: OrderStatus;
  role: MessageRole;
}

export function useOrderChat({ orderId, orderStatus, role }: UseOrderChatOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // Admin can view all messages but cannot send (for now - can be enabled later)
  const canSend = !!user && canSendMessage(orderStatus) && role !== 'admin';

  // Initial load
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);

    supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Gracefully handle missing table or permission errors
          // 42P01 = table does not exist, PGRST116 = no rows returned (which is fine)
          if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('permission denied')) {
            // Silently handle missing messages table - chat feature is optional
            if (import.meta.env.DEV && error.code === '42P01') {
              console.warn('[Chat] Messages table not found. Chat feature disabled.');
            }
          } else {
            // Only log unexpected errors
            if (import.meta.env.DEV) {
              console.error('[Chat] load error', error);
            }
          }
          setMessages([]);
        } else {
          setMessages((data as OrderMessage[]) || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Realtime subscription
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-chat:${orderId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `order_id=eq.${orderId}` 
        },
        (payload) => {
          const msg = payload.new as OrderMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Chat] Subscribed for order', orderId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Chat] Channel error for order', orderId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!user || !orderId) return;
      const text = body.trim();
      if (!text) return;
      if (!canSend) {
        console.warn('[Chat] send blocked, chat is closed for this status');
        return;
      }

      setSending(true);
      try {
        const { error } = await supabase.from('messages').insert({
          order_id: orderId,
          sender_id: user.id,
          sender_role: role,
          body: text,
        });

        if (error) {
          // Gracefully handle missing table or permission errors
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            if (import.meta.env.DEV) {
              console.warn('[Chat] Messages table not found. Run migration: 20250112_create_messages_table.sql');
            }
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            if (import.meta.env.DEV) {
              console.warn('[Chat] Permission denied. Check RLS policies for messages table.');
            }
          } else {
            console.error('[Chat] send error', error);
          }
          // Don't throw - fail silently for graceful degradation
        }
      } catch (error) {
        console.error('[Chat] unexpected error sending message', error);
      } finally {
        setSending(false);
      }
    },
    [user, orderId, canSend, role]
  );

  return {
    messages,
    loading,
    sending,
    canSend,
    sendMessage,
  };
}

