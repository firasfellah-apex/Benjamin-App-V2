import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronUp, MessageCircle, Phone, MapPin, HelpCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderWithDetails, OrderStatus } from '@/types/types';
import { getCustomerFacingStatus, getCustomerFacingStatusWithArrival, CUSTOMER_TIMELINE_STEPS } from '@/lib/customerStatus';
import { OrderProgressTimeline } from '@/components/order/OrderProgressTimeline';
import { RatingStars } from '@/components/common/RatingStars';
import { Avatar } from '@/components/common/Avatar';
import { DeliveryProgressBar } from '@/components/customer/DeliveryProgressBar';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { 
  canRevealRunnerIdentity, 
  canContactRunner, 
  getRevealMessage, 
  shouldBlurRunnerAvatar,
  isOrderFinal,
  getRunnerDisplayName
} from '@/lib/reveal';
import { shouldShowCustomerOtpToCustomer } from '@/lib/revealRunnerView';
import { rateRunner } from '@/db/api';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

interface ActiveDeliverySheetProps {
  order: OrderWithDetails;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
  onReorder?: () => void;
  onMessage?: () => void;
  onCallSupport?: () => void;
  onOrderUpdate?: (order: OrderWithDetails) => void;
}

export function ActiveDeliverySheet({
  order,
  isExpanded,
  onToggleExpand,
  onCancel,
  onReorder,
  onMessage,
  onCallSupport,
  onOrderUpdate,
}: ActiveDeliverySheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [submittingRating, setSubmittingRating] = useState(false);
  const [customerStatus, setCustomerStatus] = useState(getCustomerFacingStatus(order.status));
  const lastCheckedOrderRef = useRef<string | null>(null);
  const unreadCount = useUnreadMessages(order.id);
  
  // Check for runner arrival when status is Pending Handoff
  // Re-check whenever order updates (including when order_events change)
  useEffect(() => {
    const updateCustomerStatus = async () => {
      if (order.status === 'Pending Handoff') {
        const status = await getCustomerFacingStatusWithArrival(order.status, order);
        setCustomerStatus(status);
        lastCheckedOrderRef.current = order.id;
      } else {
        setCustomerStatus(getCustomerFacingStatus(order.status));
        lastCheckedOrderRef.current = order.id;
      }
    };
    updateCustomerStatus();
  }, [order.status, order.id, order.updated_at]);
  
  // Poll for arrival status periodically when in Pending Handoff
  // This ensures we catch arrival even if realtime subscription has issues
  // Uses a longer interval to avoid excessive API calls
  useEffect(() => {
    if (order.status !== 'Pending Handoff' || !order.id) return;
    
    // Initial check
    const checkArrival = async () => {
      const status = await getCustomerFacingStatusWithArrival(order.status, order);
      setCustomerStatus((prev) => {
        // Only update if status actually changed to avoid unnecessary re-renders
        if (prev.step !== status.step || prev.label !== status.label) {
          console.log('[ActiveDeliverySheet] Arrival status changed:', { from: prev.label, to: status.label });
          return status;
        }
        return prev;
      });
    };
    
    // Check immediately
    checkArrival();
    
    // Then check every 3 seconds
    const interval = setInterval(checkArrival, 3000);
    
    return () => clearInterval(interval);
  }, [order.status, order.id, order]);

  // Subscribe to order_events for runner arrival updates
  useEffect(() => {
    if (order.status !== 'Pending Handoff' || !order.id) return;

    const orderId = order.id; // Capture orderId in closure
    const channelName = `order-events:${orderId}:runner-arrived`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_events',
          filter: `order_id=eq.${orderId}`,
        },
        async (payload: any) => {
          // Check if this is a runner_arrived event
          const event = payload.new;
          if (event && event.client_action_id === 'runner_arrived' && event.order_id === orderId) {
            console.log('[ActiveDeliverySheet] Runner arrived event detected:', payload);
            
            // Fetch fresh order data to ensure we have the latest state
            const { getOrderById } = await import('@/db/api');
            try {
              const freshOrder = await getOrderById(orderId);
              if (freshOrder) {
                // Immediately update customer status to "Runner has arrived"
                const status = await getCustomerFacingStatusWithArrival('Pending Handoff', freshOrder);
                setCustomerStatus(status);
                
                // Also trigger order update callback to refresh order data in parent
                if (onOrderUpdate) {
                  onOrderUpdate(freshOrder);
                }
              }
            } catch (error) {
              console.error('[ActiveDeliverySheet] Error fetching fresh order after arrival:', error);
              // Fallback: try to update status with minimal order data
              const status = await getCustomerFacingStatusWithArrival('Pending Handoff', { status: 'Pending Handoff' as OrderStatus, id: orderId } as any);
              setCustomerStatus(status);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ActiveDeliverySheet] ✅ Subscribed to runner arrival events for order ${orderId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[ActiveDeliverySheet] ❌ Subscription error for ${channelName}:`, status);
          // If realtime is not enabled for order_events, gracefully degrade
          if (import.meta.env.DEV) {
            console.warn('[ActiveDeliverySheet] order_events realtime may not be enabled. Runner arrival updates may not be instant.');
            console.warn('[ActiveDeliverySheet] To enable: Run migration 20250116_enable_realtime_for_order_events.sql and enable Realtime in Supabase Dashboard → Database → Replication → order_events');
          }
        }
      });

    return () => {
      console.log(`[ActiveDeliverySheet] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [order.status, order.id, order, onOrderUpdate]);
  const showRunnerIdentity = canRevealRunnerIdentity(order.status);
  const allowContact = canContactRunner(order.status);
  const isFinal = isOrderFinal(order.status);
  const canCancel = order.status === "Pending" || order.status === "Runner Accepted";
  const isCompleted = order.status === "Completed";
  const isCancelled = order.status === "Cancelled";

  // Get status copy for collapsed state - must match the customerStatus label
  const getStatusCopy = (status: OrderStatus): string => {
    // Use the description from customerStatus which matches the label
    return customerStatus.description;
  };

  // Get expanded status copy
  const getExpandedStatusCopy = (status: OrderStatus): string => {
    if (status === 'Completed') {
      return 'All set. Thanks for trusting Benjamin.';
    }
    return customerStatus.description;
  };

  const handleRateRunner = async (rating: number) => {
    if (!order.id || order.runner_rating) return;
    
    setSubmittingRating(true);
    try {
      await rateRunner(order.id, rating);
      toast.success('Rating submitted successfully');
      // Update order state with new rating
      if (onOrderUpdate) {
        onOrderUpdate({
          ...order,
          runner_rating: rating,
        });
      }
    } catch (error: any) {
      console.error('Error rating runner:', error);
      toast.error(error?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Calculate estimated arrival time
  const calculateEstimatedArrival = (): string | null => {
    // Only show ETA when runner is on the way (Cash Withdrawn or Pending Handoff)
    if (order.status !== 'Cash Withdrawn' && order.status !== 'Pending Handoff') {
      return null;
    }

    // If cash was withdrawn, estimate 5-10 minutes from withdrawal time
    // Don't show ETA if runner has already arrived
    if (order.cash_withdrawn_at && customerStatus.step !== 'ARRIVED') {
      const withdrawnTime = new Date(order.cash_withdrawn_at);
      const estimatedMinutes = 8; // 8 minutes average
      const arrivalTime = new Date(withdrawnTime.getTime() + estimatedMinutes * 60000);
      
      // Format as "6:03 PM"
      return arrivalTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return null;
  };

  const estimatedArrival = calculateEstimatedArrival();

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out",
        "pointer-events-auto", // Ensure sheet captures pointer events
        isExpanded ? "h-[85vh]" : "h-auto"
      )}
    >
      {/* Grab Handle */}
      <button
        onClick={onToggleExpand}
        className="w-full py-3 flex justify-center items-center cursor-pointer hover:bg-neutral-50 rounded-t-3xl transition-colors"
        aria-label={isExpanded ? "Collapse details" : "Expand details"}
      >
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
      </button>

      {/* Sheet Content - iOS-style spring expand/collapse */}
      <motion.div
        layout
        className={cn("px-6 pb-6", isExpanded ? "overflow-y-auto" : "")}
        animate={{
          height: isExpanded ? "calc(85vh - 3rem)" : "auto",
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
        style={{ overflow: isExpanded ? "auto" : "hidden" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            /* COLLAPSED STATE */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.5,
              }}
              className="space-y-4"
            >
            {/* Uber-Style Status Section */}
            <div className="space-y-3">
              {/* Status Heading with Arrival Time */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">{customerStatus.label}...</h2>
                  {estimatedArrival && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-sm text-slate-600">Arrives {estimatedArrival}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info('Estimated arrival time based on average delivery time');
                        }}
                        className="ml-1"
                      >
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={onToggleExpand}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <ChevronUp className="h-5 w-5 text-neutral-600" />
                </button>
              </div>

              {/* Progress Bar */}
              <DeliveryProgressBar currentStep={customerStatus.step} />

              {/* Status Message */}
              <p className="text-sm text-slate-600">
                {customerStatus.step === 'ON_THE_WAY'
                  ? (() => {
                      const runnerName = showRunnerIdentity && order.runner 
                        ? getRunnerDisplayName(
                            (order.runner as any)?.first_name,
                            (order.runner as any)?.last_name,
                            order.status
                          )
                        : 'Your runner';
                      return `Your order is on the move! ${runnerName} has your cash and is heading your way.`;
                    })()
                  : customerStatus.step === 'ARRIVED'
                  ? 'Your runner has arrived. Please meet up and share your verification code to receive your cash.'
                  : customerStatus.description}
              </p>
            </div>

            {/* Runner Info Card (When Allowed) */}
            {showRunnerIdentity && order.runner && (customerStatus.step === 'ON_THE_WAY' || customerStatus.step === 'ARRIVED' || customerStatus.step === 'PREPARING') && (() => {
              const runnerFirstName = (order.runner as any)?.first_name;
              const runnerLastName = (order.runner as any)?.last_name;
              const runnerAvatar = (order.runner as any)?.avatar_url;
              const displayName = getRunnerDisplayName(runnerFirstName, runnerLastName, order.status);
              
              return (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={runnerAvatar || undefined}
                      fallback={displayName}
                      size="sm"
                      className={cn(
                        "transition-all duration-300",
                        shouldBlurRunnerAvatar(order.status) && "blur-sm"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {displayName}
                        </p>
                        {(order.runner as any)?.average_rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-600">{(order.runner as any).average_rating.toFixed(0)}%</span>
                            <span className="text-emerald-500">👍</span>
                          </div>
                        )}
                      </div>
                      {!shouldBlurRunnerAvatar(order.status) && (
                        <p className="text-xs text-slate-500 mt-0.5">Benjamin Runner</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* OTP Display (when OTP is generated) - Collapsed State */}
            {shouldShowCustomerOtpToCustomer(order.status, !!order.otp_code) && order.otp_code && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl space-y-2">
                <p className="text-xs font-medium text-green-900">Verification Code</p>
                <p className="text-[10px] text-green-700">
                  {customerStatus.step === 'ARRIVED' 
                    ? 'Share this code with your runner to receive your cash'
                    : 'Share this code only with your Benjamin runner when they arrive'}
                </p>
                <div className="flex justify-center gap-1.5">
                  {order.otp_code.split('').map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-10 flex items-center justify-center bg-white border-2 border-green-300 rounded-lg text-lg font-bold text-green-900"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-green-700 text-center">
                  {customerStatus.step === 'ARRIVED'
                    ? 'Your runner has arrived. Share your code to complete the exchange.'
                    : 'Your runner has your cash and is heading your way.'}
                </p>
              </div>
            )}

            {/* Message Button (Active Only) - Full Width */}
            {allowContact && !isCompleted && !isCancelled && (
              <div className="pt-2">
                <Button
                  onClick={() => navigate(`/customer/chat/${order.id}`)}
                  className="w-full h-10 rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2 relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Message Runner</span>
                  {unreadCount > 0 && (
                    <span className="absolute right-4 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Help Link (Completed) */}
            {isCompleted && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    // Navigate to support or show help
                    toast.info('Help feature coming soon');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  Help with this delivery
                </button>
              </div>
            )}
            </motion.div>
          ) : (
            /* EXPANDED STATE */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.5,
              }}
              className="space-y-6"
            >
            {/* Header Summary */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">{customerStatus.label}</h2>
              <p className="text-sm text-slate-500">{getExpandedStatusCopy(order.status)}</p>
            </div>

            {/* Order Snapshot */}
            <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Cash Amount</div>
                  <div className="text-lg font-semibold text-slate-900">${order.requested_amount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Total Payment</div>
                  <div className="text-lg font-semibold text-slate-900">${order.total_payment.toFixed(2)}</div>
                </div>
              </div>
              
              {/* Delivery Address */}
              <div className="pt-2 border-t border-neutral-100">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Delivery Address</div>
                    <div className="text-sm text-slate-900">{order.customer_address || 'Address not available'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Runner Strip (When Allowed) */}
            {showRunnerIdentity && order.runner ? (
              <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={order.runner.avatar_url || undefined}
                    fallback={order.runner.first_name || 'Runner'}
                    size="md"
                    className={cn(
                      "transition-all duration-300",
                      shouldBlurRunnerAvatar(order.status) && "blur-sm"
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {order.runner.first_name || 'Runner'}
                      {order.runner.last_name && ` ${order.runner.last_name}`}
                    </p>
                    <p className="text-xs text-slate-500">Your Benjamin runner</p>
                  </div>
                </div>
                
                {/* Runner Fun Fact */}
                {order.runner.first_name && (order.runner as any)?.fun_fact && (
                  <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-900 leading-relaxed">
                      <span className="font-medium">{order.runner.first_name}</span>
                      {' — '}
                      {(order.runner as any).fun_fact}
                    </p>
                  </div>
                )}
              </div>
            ) : !isFinal && !isCancelled ? (
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs text-blue-900">
                  {getRevealMessage(order.status)}
                </p>
              </div>
            ) : null}

            {/* OTP Display (when OTP is generated) */}
            {shouldShowCustomerOtpToCustomer(order.status, !!order.otp_code) && order.otp_code && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                <p className="text-sm font-medium text-green-900">
                  {customerStatus.step === 'ARRIVED'
                    ? 'Share this code with your runner to receive your cash'
                    : 'Share this code only with your Benjamin runner when they arrive'}
                </p>
                <div className="flex justify-center gap-2">
                  {order.otp_code.split('').map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-12 flex items-center justify-center bg-white border-2 border-green-300 rounded-lg text-xl font-bold text-green-900"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 text-center">
                  {customerStatus.step === 'ARRIVED'
                    ? 'Your runner has arrived. Share your code to complete the exchange.'
                    : 'Your runner has your cash and is heading your way.'}
                </p>
              </div>
            )}

            {/* Delivery Progress Timeline */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Delivery Progress</h3>
              <OrderProgressTimeline
                currentStatus={order.status}
                variant="customer"
                tone="customer"
                currentStep={customerStatus.step}
              />
            </div>

            {/* Messages */}
            {allowContact && !isCompleted && !isCancelled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-5 w-5 text-slate-600" />
                  <h3 className="text-sm font-medium text-slate-900">Message Runner</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Communicate with your runner about delivery details
                </p>
                <Button
                  onClick={() => navigate(`/customer/chat/${order.id}`)}
                  className="w-full bg-black hover:bg-black/90 text-white rounded-xl py-3"
                >
                  Open Chat
                </Button>
                
                {/* Call Support Link */}
                <div className="pt-2">
                  <button
                    onClick={onCallSupport}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 w-full justify-center"
                  >
                    <Phone className="h-3 w-3" />
                    Call Support
                  </button>
                </div>
              </div>
            )}

            {/* Rate Your Runner (Completed Only) */}
            {isCompleted && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">Rate your runner</div>
                <RatingStars
                  value={order.runner_rating ?? 0}
                  onChange={order.runner_rating ? undefined : handleRateRunner}
                  readOnly={!!order.runner_rating || submittingRating}
                />
              </div>
            )}

            {/* Reorder CTA (Completed Only) */}
            {isCompleted && onReorder && (
              <Button
                onClick={onReorder}
                className="w-full rounded-2xl bg-black text-white hover:bg-black/90 h-12"
              >
                Reorder this delivery
              </Button>
            )}

            {/* Cancel (Subtle Text Button) */}
            {canCancel && onCancel && (
              <button
                onClick={onCancel}
                className="mt-3 w-full text-center text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
              >
                Cancel this delivery
              </button>
            )}

            {/* Order ID Footer */}
            <div className="text-center pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

