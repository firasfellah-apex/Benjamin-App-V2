import React, { useState, useEffect, useRef } from 'react';
import { useOrderChat } from '@/hooks/useOrderChat';
import { getChatClosedMessage } from '@/lib/chatPermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStatus } from '@/types/types';
import type { MessageRole } from '@/types/chat';
import { cn } from '@/lib/utils';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderChatThreadProps {
  orderId: string;
  orderStatus: OrderStatus;
  role: MessageRole;
  variant?: 'customer' | 'runner' | 'admin';
}

export const OrderChatThread: React.FC<OrderChatThreadProps> = ({ 
  orderId, 
  orderStatus, 
  role,
  variant = 'customer'
}) => {
  const { user } = useAuth();
  const { messages, loading, sending, canSend, sendMessage } = useOrderChat({
    orderId,
    orderStatus,
    role,
  });
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    await sendMessage(input);
    setInput('');
  };

  // Theme-specific styles based on variant
  const isDark = variant === 'runner';
  const isAdmin = variant === 'admin';

  const containerStyles = isDark
    ? 'bg-slate-800/50 border-slate-700'
    : isAdmin
    ? 'bg-[#1B1D21] border-[#2A2D35]'
    : 'bg-gray-50 border-gray-200';

  const inputStyles = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-indigo-500'
    : isAdmin
    ? 'bg-[#25272E] border-[#2A2D35] text-[#F1F3F5] placeholder:text-[#6B7280] focus:ring-indigo-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-black/5';

  const messageStyles = {
    me: isDark
      ? 'bg-indigo-600 text-white'
      : isAdmin
      ? 'bg-indigo-600 text-white'
      : 'bg-black text-white',
    other: isDark
      ? 'bg-slate-700 text-slate-200 border border-slate-600'
      : isAdmin
      ? 'bg-[#25272E] text-[#E5E7EB] border border-[#2A2D35]'
      : 'bg-white text-gray-900 border border-gray-200',
  };

  const textStyles = {
    primary: isDark ? 'text-slate-300' : isAdmin ? 'text-[#E5E7EB]' : 'text-gray-900',
    secondary: isDark ? 'text-slate-400' : isAdmin ? 'text-[#6B7280]' : 'text-gray-500',
    muted: isDark ? 'text-slate-500' : isAdmin ? 'text-[#6B7280]' : 'text-gray-400',
  };

  const bannerStyles = isDark
    ? 'bg-slate-800/50 text-slate-400 border-slate-700'
    : isAdmin
    ? 'bg-[#25272E] text-[#6B7280] border-[#2A2D35]'
    : 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <div className={cn("mt-4 flex flex-col gap-3", variant === 'admin' && 'mt-6')}>
      <div className={cn("flex items-center gap-2", textStyles.secondary)}>
        <MessageSquare className={cn("h-4 w-4", textStyles.secondary)} />
        <span className={cn("text-sm font-medium", textStyles.secondary)}>
          Messages about this delivery
        </span>
      </div>

      {/* Messages List */}
      <div className={cn(
        "max-h-64 overflow-y-auto rounded-xl px-3 py-3 space-y-2 border",
        containerStyles
      )}>
        {loading && messages.length === 0 && (
          <div className={cn("text-xs text-center py-4", textStyles.muted)}>
            Loading messages...
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className={cn("text-xs text-center py-4", textStyles.muted)}>
            {role === 'customer' 
              ? "No messages yet. Use this to coordinate with your runner."
              : role === 'runner'
              ? "No messages yet. Use this to coordinate with the customer."
              : "No messages for this order."}
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          const isAdminMessage = m.sender_role === 'admin';
          
          return (
            <div
              key={m.id}
              className={cn("flex", isMe ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed break-words",
                  isMe ? messageStyles.me : messageStyles.other
                )}
              >
                {/* Show sender role for admin view, or when not me, or always for clarity */}
                {(isAdmin || !isMe) && (
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    isMe ? 'opacity-90' : textStyles.muted
                  )}>
                    {isAdminMessage 
                      ? 'Admin'
                      : m.sender_role === 'customer'
                      ? 'Customer'
                      : 'Runner'}
                  </div>
                )}
                <div className="break-words">{m.body}</div>
                <div className={cn(
                  "text-xs mt-1",
                  isMe ? 'opacity-70' : textStyles.muted
                )}>
                  {new Date(m.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Closed Banner - Only show for customer/runner, not admin */}
      {!canSend && role !== 'admin' && (
        <div className={cn(
          "rounded-xl px-3 py-2 text-xs border",
          bannerStyles
        )}>
          {getChatClosedMessage()}
        </div>
      )}

      {/* Admin Read-Only Notice */}
      {role === 'admin' && (
        <div className={cn(
          "rounded-xl px-3 py-2 text-xs border",
          bannerStyles
        )}>
          Read-only view. All messages are visible for dispute resolution and QA.
        </div>
      )}

      {/* Message Input */}
      {canSend && (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            className={cn(
              "flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-offset-1",
              inputStyles
            )}
            placeholder="Message about this delivery…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            size="sm"
            className={cn(
              "rounded-full px-4",
              isDark 
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : isAdmin
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-black hover:bg-black/90 text-white"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
};

