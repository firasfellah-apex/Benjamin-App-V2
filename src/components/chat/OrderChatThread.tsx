import React, { useState, useEffect, useRef } from 'react';
import { useOrderChat } from '@/hooks/useOrderChat';
import { getChatClosedMessage } from '@/lib/chatPermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStatus, Profile } from '@/types/types';
import type { MessageRole, OrderMessage } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/common/Avatar';
import { getCustomerPublicProfile } from '@/lib/revealRunnerView';

interface OrderChatThreadProps {
  orderId: string;
  orderStatus: OrderStatus;
  role: MessageRole;
  variant?: 'customer' | 'runner' | 'admin';
  // Optional: Pass order data to show avatars
  customerProfile?: Profile | null;
  runnerProfile?: Profile | null;
}

export const OrderChatThread: React.FC<OrderChatThreadProps> = ({ 
  orderId, 
  orderStatus, 
  role,
  variant = 'customer',
  customerProfile,
  runnerProfile
}) => {
  const { user } = useAuth();
  const { messages, loading, sending, canSend, sendMessage, markMessagesAsRead } = useOrderChat({
    orderId,
    orderStatus,
    role,
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const hasMarkedAsReadRef = useRef(false);

  // Mark messages as read when component mounts or when new messages arrive
  useEffect(() => {
    if (!user || messages.length === 0) return;

    // Get unread messages from other people
    const unreadMessages = messages.filter(
      (msg) => msg.sender_id !== user.id && !msg.is_read
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      markMessagesAsRead(messageIds);
      hasMarkedAsReadRef.current = true;
    }
  }, [messages, user?.id, markMessagesAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Use scrollTo for smoother behavior
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  // Get avatar info for other person
  const getOtherPersonAvatar = (senderRole: MessageRole) => {
    if (senderRole === 'customer' && customerProfile) {
      // For runner viewing customer messages
      const customerPublic = getCustomerPublicProfile(orderStatus, customerProfile);
      return {
        avatarUrl: customerPublic.avatarUrl,
        displayName: customerPublic.displayName,
        fallback: customerProfile.first_name || customerProfile.last_name || 'Customer'
      };
    } else if (senderRole === 'runner' && runnerProfile) {
      // For customer viewing runner messages
      const fullName = `${runnerProfile.first_name || ''} ${runnerProfile.last_name || ''}`.trim();
      return {
        avatarUrl: runnerProfile.avatar_url,
        displayName: fullName || 'Runner',
        fallback: runnerProfile.first_name || runnerProfile.last_name || 'Runner'
      };
    }
    return {
      avatarUrl: null,
      displayName: senderRole === 'customer' ? 'Customer' : 'Runner',
      fallback: senderRole === 'customer' ? 'C' : 'R'
    };
  };

  // Quick message suggestions based on role and status
  const getQuickMessages = (): string[] => {
    if (role === 'customer') {
      return [
        "Are you here?",
        "I'm waiting outside",
        "Where are you?",
        "Thanks!"
      ];
    } else if (role === 'runner') {
      return [
        "I'm on my way",
        "I've arrived",
        "I'm outside",
        "See you soon"
      ];
    }
    return [];
  };

  const quickMessages = getQuickMessages();

  const handleQuickMessage = async (message: string) => {
    if (sending) return;
    // Send message - optimistic update will show it immediately
    await sendMessage(message);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    await sendMessage(input);
    setInput('');
  };

  // Theme-specific styles based on variant
  const isDark = variant === 'runner';
  const isAdmin = variant === 'admin';

  // Modern chat container - no border, subtle background
  const containerStyles = isDark
    ? 'bg-slate-900/30'
    : isAdmin
    ? 'bg-[#1B1D21]'
    : 'bg-slate-50';

  // Input styles - modern rounded input
  const inputStyles = isDark
    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500'
    : isAdmin
    ? 'bg-[#25272E] border-[#2A2D35] text-[#F1F3F5] placeholder:text-[#6B7280] focus:ring-indigo-500'
    : 'bg-white border-slate-200 text-gray-900 placeholder:text-slate-400 focus:ring-black/10 focus:border-black/20';

  // Message bubble styles - modern rounded bubbles
  const messageStyles = {
    me: isDark
      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
      : isAdmin
      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
      : 'bg-black text-white rounded-2xl rounded-br-sm',
    other: isDark
      ? 'bg-slate-800 text-slate-100 rounded-2xl rounded-bl-sm'
      : isAdmin
      ? 'bg-[#25272E] text-[#E5E7EB] rounded-2xl rounded-bl-sm'
      : 'bg-white text-gray-900 border border-slate-200 rounded-2xl rounded-bl-sm',
  };

  const textStyles = {
    primary: isDark ? 'text-slate-100' : isAdmin ? 'text-[#E5E7EB]' : 'text-gray-900',
    secondary: isDark ? 'text-slate-400' : isAdmin ? 'text-[#6B7280]' : 'text-slate-600',
    muted: isDark ? 'text-slate-500' : isAdmin ? 'text-[#6B7280]' : 'text-slate-400',
  };

  const bannerStyles = isDark
    ? 'bg-slate-800/50 text-slate-400 border-slate-700'
    : isAdmin
    ? 'bg-[#25272E] text-[#6B7280] border-[#2A2D35]'
    : 'bg-slate-50 text-slate-500 border-slate-200';

  // Group messages by sender for better visual flow
  const groupedMessages: OrderMessage[][] = messages.reduce((acc, msg, idx) => {
    const prevMsg = idx > 0 ? messages[idx - 1] : null;
    const shouldGroup = prevMsg && 
      prevMsg.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 300000; // 5 minutes
    
    if (shouldGroup && acc.length > 0) {
      acc[acc.length - 1].push(msg);
    } else {
      acc.push([msg]);
    }
    return acc;
  }, [] as OrderMessage[][]);

  return (
    <div className={cn("flex flex-col h-full min-h-0", variant === 'admin' && 'mt-6')}>
      {/* Messages List - Scrollable area */}
      <div 
        ref={messagesContainerRef}
        className={cn(
          "flex-1 overflow-y-auto px-4 py-4 min-h-0",
          containerStyles
        )}
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {loading && messages.length === 0 && (
          <div className={cn("text-sm text-center py-8", textStyles.muted)}>
            Loading messages...
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className={cn("text-sm text-center py-8", textStyles.muted)}>
            {role === 'customer' 
              ? "No messages yet. Use this to coordinate with your runner."
              : role === 'runner'
              ? "No messages yet. Use this to coordinate with the customer."
              : "No messages for this order."}
          </div>
        )}

        {/* Grouped messages with avatars */}
        <div className="space-y-4">
          {groupedMessages.map((group) => {
            const firstMsg = group[0];
            const isMe = firstMsg.sender_id === user?.id;
            const isAdminMessage = firstMsg.sender_role === 'admin';
            const otherPerson = getOtherPersonAvatar(firstMsg.sender_role);
            
            // Debug: Log avatar data with explicit values
            if (import.meta.env.DEV && !isMe) {
              console.group(`[Chat Avatar Debug] ${firstMsg.sender_role} message`);
              console.log('Sender Role:', firstMsg.sender_role);
              console.log('Order Status:', orderStatus);
              console.log('Customer Profile exists:', !!customerProfile);
              console.log('Runner Profile exists:', !!runnerProfile);
              if (customerProfile) {
                console.log('Customer avatar_url:', customerProfile.avatar_url);
                console.log('Customer name:', customerProfile.first_name);
              }
              if (runnerProfile) {
                console.log('Runner avatar_url:', runnerProfile.avatar_url);
                console.log('Runner name:', runnerProfile.first_name);
              }
              console.log('Computed avatarUrl:', otherPerson.avatarUrl);
              console.log('Will render avatar:', !!otherPerson.avatarUrl);
              console.log('Fallback:', otherPerson.fallback);
              console.groupEnd();
            }
            
            return (
              <div
                key={firstMsg.id}
                className={cn("flex gap-2", isMe ? 'flex-row-reverse' : 'flex-row')}
              >
                {/* Avatar - only show for other person's messages */}
                {!isMe && (
                  <div className="flex-shrink-0 self-end mb-1">
                    <Avatar
                      src={otherPerson.avatarUrl || undefined}
                      fallback={otherPerson.fallback || '?'}
                      size="sm"
                      alt={otherPerson.displayName}
                      className="h-8 w-8"
                    />
                  </div>
                )}
                
                {/* Message group */}
                <div className={cn("flex flex-col gap-1", isMe ? 'items-end' : 'items-start', isMe ? 'max-w-[75%]' : 'max-w-[75%]')}>
                  {/* Sender name (only for other person, first message in group) */}
                  {!isMe && (
                    <div className={cn("text-xs font-medium px-1", textStyles.muted)}>
                      {isAdminMessage 
                        ? 'Admin'
                        : firstMsg.sender_role === 'customer'
                        ? otherPerson.displayName
                        : otherPerson.displayName}
                    </div>
                  )}
                  
                  {/* Message bubbles */}
                  <div className={cn("flex flex-col gap-1", isMe ? 'items-end' : 'items-start')}>
                    {group.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm",
                          messageStyles[isMe ? 'me' : 'other'],
                          "max-w-full"
                        )}
                      >
                        <div className="break-words whitespace-pre-wrap">{msg.body}</div>
                        <div className={cn(
                          "text-[10px] mt-1.5",
                          isMe ? 'text-white/70' : textStyles.muted
                        )}>
                          {new Date(msg.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Spacer for my messages */}
                {isMe && <div className="flex-shrink-0 w-8" />}
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Section - Pills and Input - Adjusts with keyboard */}
      <div 
        className={cn(
          "flex-shrink-0 border-t w-full",
          isDark 
            ? "border-slate-700 bg-[#020817]"
            : isAdmin
            ? "border-[#2A2D35] bg-[#0B1020]"
            : "border-slate-200 bg-white"
        )}
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
        }}
      >
        {/* Chat Closed Banner - Only show for customer/runner, not admin */}
        {!canSend && role !== 'admin' && (
          <div className={cn(
            "rounded-xl px-4 py-3 text-xs border mx-4 mt-3",
            bannerStyles
          )}>
            {getChatClosedMessage()}
          </div>
        )}

        {/* Admin Read-Only Notice */}
        {role === 'admin' && (
          <div className={cn(
            "rounded-xl px-4 py-3 text-xs border mx-4 mt-3",
            bannerStyles
          )}>
            Read-only view. All messages are visible for dispute resolution and QA.
          </div>
        )}

        {/* Quick Message Pills - Full width responsive */}
        {canSend && quickMessages.length > 0 && (
          <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide w-full">
            {quickMessages.map((msg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickMessage(msg)}
                disabled={sending}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                    : isAdmin
                    ? "bg-[#25272E] text-[#E5E7EB] hover:bg-[#2A2D35] border border-[#2A2D35]"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                )}
              >
                {msg}
              </button>
            ))}
          </div>
        )}

        {/* Message Input - Full width responsive */}
        {canSend && (
          <form onSubmit={onSubmit} className="flex gap-2 px-4 pb-4 pt-2 w-full">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-offset-0 transition-all",
                inputStyles
              )}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
          </div>
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className={cn(
              "rounded-xl w-12 h-12 p-0 flex items-center justify-center flex-shrink-0",
              isDark 
                ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                : isAdmin
                ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                : "bg-black hover:bg-black/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Send className={cn("h-5 w-5", sending && "opacity-50")} />
          </Button>
        </form>
        )}
      </div>
    </div>
  );
};

