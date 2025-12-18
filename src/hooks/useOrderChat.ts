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

  // Initial load with read status
  useEffect(() => {
    if (!orderId || !user) return;
    let cancelled = false;
    setLoading(true);

    const loadMessages = async () => {
      try {
        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (cancelled) return;

        if (messagesError) {
          // Gracefully handle missing table or permission errors
          if (messagesError.code === '42P01' || messagesError.code === 'PGRST116' || messagesError.message?.includes('does not exist') || messagesError.message?.includes('permission denied')) {
            if (import.meta.env.DEV && messagesError.code === '42P01') {
              console.warn('[Chat] Messages table not found. Chat feature disabled.');
            }
          } else {
            if (import.meta.env.DEV) {
              console.error('[Chat] load error', messagesError);
            }
          }
          setMessages([]);
          return;
        }

        // Load read status
        const messageIds = (messagesData || []).map(m => m.id);
        let readStatuses: Set<string> = new Set();
        
        if (messageIds.length > 0) {
          try {
            const { data: readsData, error: readsError } = await supabase
              .from('message_reads')
              .select('message_id')
              .eq('user_id', user.id)
              .in('message_id', messageIds);

            if (!readsError && readsData) {
              readStatuses = new Set(readsData.map(r => r.message_id));
            }
          } catch (readsError: any) {
            // Gracefully handle missing message_reads table
            if (import.meta.env.DEV && (readsError.code === '42P01' || readsError.message?.includes('does not exist'))) {
              console.warn('[Chat] message_reads table not found. Run migration: 20250119_add_message_reads.sql');
            }
          }
        }

        // Combine messages with read status
        const messagesWithReadStatus = (messagesData || []).map((msg: any) => ({
          ...msg,
          is_read: msg.sender_id === user.id || readStatuses.has(msg.id)
        }));

        setMessages(messagesWithReadStatus as OrderMessage[]);
      } catch (error) {
        if (!cancelled) {
          console.error('[Chat] Unexpected error loading messages:', error);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [orderId, user?.id]);

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
            // Avoid duplicates by ID
            if (prev.some((m) => m.id === msg.id)) return prev;
            
            // If this is our own message, check if we have an optimistic version
            // and replace it with the real one
            if (msg.sender_id === user?.id) {
              // Find optimistic message with matching body and recent timestamp
              const optimisticIndex = prev.findIndex(
                (m) => m.id.startsWith('temp-') && 
                       m.body === msg.body && 
                       m.sender_id === msg.sender_id &&
                       Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000
              );
              
              if (optimisticIndex >= 0) {
                // Replace optimistic message with real one
                const updated = [...prev];
                updated[optimisticIndex] = {
                  ...msg,
                  is_read: true // Own messages are always "read"
                };
                return updated;
              }
            }
            
            // New messages from others are unread by default
            const newMsg: OrderMessage = {
              ...msg,
              is_read: msg.sender_id === user?.id // Own messages are always "read"
            };
            return [...prev, newMsg];
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

      // Create optimistic message immediately for instant UI feedback
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: OrderMessage = {
        id: tempId,
        order_id: orderId,
        sender_id: user.id,
        sender_role: role,
        body: text,
        created_at: new Date().toISOString(),
        is_read: true, // Own messages are always "read"
      };

      // Optimistically add message to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const { data, error } = await supabase.from('messages').insert({
          order_id: orderId,
          sender_id: user.id,
          sender_role: role,
          body: text,
        }).select().single();

        if (error) {
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          
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
        } else if (data) {
          // Replace optimistic message with real one from database
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempId);
            // Check if real message already exists (from realtime subscription)
            if (filtered.some((m) => m.id === data.id)) {
              return filtered;
            }
            // Add real message
            return [...filtered, {
              ...data,
              is_read: true, // Own messages are always "read"
            } as OrderMessage];
          });
        }
      } catch (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        console.error('[Chat] unexpected error sending message', error);
      } finally {
        setSending(false);
      }
    },
    [user, orderId, canSend, role]
  );

  // Mark messages as read when they're viewed
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || !orderId || messageIds.length === 0) return;

    try {
      // Insert read receipts (ignore conflicts if already read)
      const reads = messageIds.map(messageId => ({
        message_id: messageId,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('message_reads')
        .upsert(reads, { onConflict: 'message_id,user_id', ignoreDuplicates: true });

      if (error) {
        // Gracefully handle missing table
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          if (import.meta.env.DEV) {
            console.warn('[Chat] message_reads table not found. Run migration: 20250119_add_message_reads.sql');
          }
        } else {
          console.error('[Chat] Error marking messages as read:', error);
        }
      } else {
        // Update local state to reflect read status
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
          )
        );
      }
    } catch (error) {
      console.error('[Chat] Unexpected error marking messages as read:', error);
    }
  }, [user, orderId]);

  return {
    messages,
    loading,
    sending,
    canSend,
    sendMessage,
    markMessagesAsRead,
  };
}

