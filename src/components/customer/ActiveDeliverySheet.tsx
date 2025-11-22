import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Phone, MapPin, HelpCircle, Clock, Info } from 'lucide-react';
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
import { OtpDisplay } from '@/components/customer/OtpDisplay';
import { rateRunner } from '@/db/api';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

// Loader component for runner assignment state
import LottieComponent from "lottie-react";
import runnerLoadingAnimationData from "@/assets/animations/runner-loader-green.json";

interface ActiveDeliverySheetProps {
  order: OrderWithDetails;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
  onReorder?: () => void;
  onMessage?: () => void;
  onCallSupport?: () => void;
  onOrderUpdate?: (order: OrderWithDetails) => void;
  // Tell parent how tall the collapsed sheet is (for map padding)
  onCollapsedHeightChange?: (height: number) => void;
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
  onCollapsedHeightChange,
}: ActiveDeliverySheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [submittingRating, setSubmittingRating] = useState(false);
  const [customerStatus, setCustomerStatus] = useState(getCustomerFacingStatus(order.status));
  const lastCheckedOrderRef = useRef<string | null>(null);
  const unreadCount = useUnreadMessages(order.id);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const progressTimelineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [collapsedHeight, setCollapsedHeight] = useState<number>(260); // sensible default
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number>(0);
  
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

  /**
   * Format address for collapsed view (concise, recognizable format)
   * Returns: { primaryLine, secondaryLine }
   * - primaryLine: Label if available, otherwise street address
   * - secondaryLine: City, state (or street address if label exists)
   */
  const formatAddressForCollapsed = (): { primaryLine: string; secondaryLine: string } => {
    const address = order.address_snapshot;
    
    // Get label if available
    const label = address?.label;
    
    // Get street line 1 (abbreviated and truncated if needed)
    const abbreviateStreet = (street: string): string => {
      return street
        .replace(/\bNorthwest\b/gi, 'NW')
        .replace(/\bNortheast\b/gi, 'NE')
        .replace(/\bSouthwest\b/gi, 'SW')
        .replace(/\bSoutheast\b/gi, 'SE')
        .replace(/\bNorth\b/gi, 'N')
        .replace(/\bSouth\b/gi, 'S')
        .replace(/\bEast\b/gi, 'E')
        .replace(/\bWest\b/gi, 'W')
        .replace(/\bStreet\b/gi, 'St')
        .replace(/\bAvenue\b/gi, 'Ave')
        .replace(/\bRoad\b/gi, 'Rd')
        .replace(/\bBoulevard\b/gi, 'Blvd')
        .replace(/\bApartment\b/gi, 'Apt')
        .replace(/\bBuilding\b/gi, 'Bldg')
        .replace(/\bSuite\b/gi, 'Ste');
    };
    
    let streetLine = '';
    if (address?.line1) {
      streetLine = abbreviateStreet(address.line1);
      
      // Add line2 if available (abbreviated)
      if (address.line2) {
        streetLine += `, ${abbreviateStreet(address.line2)}`;
      }
      
      // Truncate if too long (max ~28 chars)
      if (streetLine.length > 28) {
        streetLine = streetLine.substring(0, 25) + '…';
      }
    } else if (order.customer_address) {
      // Fallback to customer_address - extract first line
      const parts = order.customer_address.split(',');
      streetLine = abbreviateStreet(parts[0]?.trim() || '');
      if (streetLine.length > 28) {
        streetLine = streetLine.substring(0, 25) + '…';
      }
    }
    
    // Get city/state line
    let cityLine = '';
    if (address?.city && address?.state) {
      cityLine = `${address.city}, ${address.state}`;
    } else if (order.customer_address) {
      // Try to extract city/state from customer_address
      const parts = order.customer_address.split(',');
      if (parts.length >= 2) {
        const cityPart = parts[parts.length - 2]?.trim() || '';
        const stateZipPart = parts[parts.length - 1]?.trim() || '';
        // Extract state (usually 2 letters before zip)
        const stateMatch = stateZipPart.match(/\b([A-Z]{2})\b/);
        const state = stateMatch ? stateMatch[1] : '';
        cityLine = state ? `${cityPart}, ${state}` : cityPart;
      }
    }
    
    // Return format: primaryLine (label or street), secondaryLine (street if label exists, otherwise city)
    if (label) {
      // If label exists: show label as primary, street + city as secondary
      return {
        primaryLine: label,
        secondaryLine: streetLine ? `${streetLine}${cityLine ? ` • ${cityLine}` : ''}` : cityLine
      };
    } else if (streetLine) {
      // If no label: show street as primary, city as secondary
      return {
        primaryLine: streetLine,
        secondaryLine: cityLine
      };
    } else {
      // Fallback
      return {
        primaryLine: order.customer_address || 'Address not available',
        secondaryLine: ''
      };
    }
  };

  const estimatedArrival = calculateEstimatedArrival();

  // Auto-scroll to Delivery Progress when expanding
  useEffect(() => {
    if (!isExpanded) return;
    
    // Small delay to ensure content is rendered and refs are set
    const timeoutId = setTimeout(() => {
      if (progressTimelineRef.current && scrollContainerRef.current) {
        try {
          progressTimelineRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        } catch (error) {
          console.warn('[ActiveDeliverySheet] Auto-scroll failed:', error);
        }
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [isExpanded]);

  // Measure collapsed height and notify parent for map padding
  useEffect(() => {
    if (!sheetRef.current || isExpanded) {
      // Only measure when collapsed
      if (onCollapsedHeightChange && !isExpanded) {
        // Use default when expanded
        onCollapsedHeightChange(260);
      }
      return;
    }

    const measureHeight = () => {
      if (!sheetRef.current) return;
      
      const rect = sheetRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      
      if (totalHeight > 0 && totalHeight !== collapsedHeight) {
        setCollapsedHeight(totalHeight);
        if (onCollapsedHeightChange) {
          onCollapsedHeightChange(totalHeight);
        }
      }
    };

    // Initial measurement
    measureHeight();

    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(measureHeight);
    });

    resizeObserver.observe(sheetRef.current);

    // Also measure after a short delay to catch dynamic content
    const timeout = setTimeout(measureHeight, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [isExpanded, onCollapsedHeightChange, collapsedHeight, order.status, order.otp_code, customerStatus]);

  // Handle drag gestures for swipe to expand/collapse
  const handleDragStart = (event: any, info: any) => {
    if (!info?.point?.y) return;
    dragStartY.current = info.point.y;
  };

  const handleDrag = (event: any, info: any) => {
    if (!info?.point?.y) return;
    
    if (!isExpanded) {
      // When collapsed: only allow dragging up (negative deltaY)
      const deltaY = info.point.y - dragStartY.current;
      if (deltaY < 0) {
        // Clamp to prevent dragging too far
        setDragY(Math.max(deltaY, -100));
      } else {
        setDragY(0);
      }
    } else {
      // When expanded: only allow dragging down if at top of scroll
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      if (scrollTop === 0) {
        const deltaY = info.point.y - dragStartY.current;
        if (deltaY > 0) {
          // Clamp to prevent dragging too far
          setDragY(Math.min(deltaY, 100));
        } else {
          setDragY(0);
        }
      } else {
        setDragY(0);
      }
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (!info?.point?.y) {
      setDragY(0);
      return;
    }
    
    const deltaY = info.point.y - dragStartY.current;
    const threshold = 50; // Minimum drag distance to trigger expand/collapse
    
    if (!isExpanded) {
      // Swiped up when collapsed - expand
      if (deltaY < -threshold) {
        onToggleExpand();
      }
    } else {
      // Swiped down when expanded - only collapse if at top of scroll
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
      if (deltaY > threshold && scrollTop === 0) {
        onToggleExpand();
      }
    }
    
    // Reset drag position
    setDragY(0);
  };

  // Handle scroll to check if we're at top (for collapse gesture)
  const handleScroll = () => {
    // When scroll position changes, reset drag if needed
    if (isExpanded && scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop ?? 0;
      if (scrollTop > 0) {
        setDragY(0);
      }
    }
  };

  return (
    <motion.div
      ref={sheetRef}
      layout
      drag={!isExpanded ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      dragDirectionLock={true}
      onDragStart={!isExpanded ? handleDragStart : () => {}}
      onDrag={!isExpanded ? handleDrag : () => {}}
      onDragEnd={!isExpanded ? handleDragEnd : () => {}}
      style={!isExpanded ? { y: dragY } : undefined}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-white rounded-t-[24px] shadow-2xl",
        "pointer-events-auto flex flex-col",
        isExpanded ? "h-[85vh] overflow-hidden" : "overflow-visible",
        !isExpanded && "cursor-grab active:cursor-grabbing"
      )}
      initial={false}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
    >
      {/* Grab Handle - Fixed at top - Handles drag when expanded and at top of scroll */}
      <motion.button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleExpand();
        }}
        drag={isExpanded ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        dragDirectionLock={true}
        onDragStart={isExpanded ? handleDragStart : () => {}}
        onDrag={isExpanded ? handleDrag : () => {}}
        onDragEnd={isExpanded ? handleDragEnd : () => {}}
        className={cn(
          "w-full py-3 flex justify-center items-center cursor-pointer bg-white rounded-t-[24px] transition-colors active:bg-neutral-50 flex-shrink-0 relative z-10 touch-manipulation",
          isExpanded && "cursor-grab active:cursor-grabbing"
        )}
        aria-label={isExpanded ? "Collapse details" : "Expand details"}
        type="button"
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
      </motion.button>

      {/* Sheet Content - Scrollable when expanded */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "px-6 w-full",
          isExpanded ? "overflow-y-auto overflow-x-hidden flex-1 pb-6" : "pb-8"
        )}
      >
        {!isExpanded ? (
            /* COLLAPSED STATE */
            <div className="space-y-4">
            {/* Collapsed Summary - Reordered */}
            <div className="space-y-4">
              {/* 1. Title and Sub Label - Grouped together */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{customerStatus.label}...</h2>
                <p className="text-sm text-slate-600 pt-[6px]">
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

              {/* 3. Progress Bar */}
              <div className="py-3">
                <DeliveryProgressBar currentStep={customerStatus.step} />
              </div>

              {/* 4. Order Snapshot: Cash Amount, Total Payment, Delivery Address - Full Width */}
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
                
                {/* Delivery Address - Collapsed View (Concise Format) */}
                <div className="pt-2 border-t border-neutral-100">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Delivery Address</div>
                    {(() => {
                      const { primaryLine, secondaryLine } = formatAddressForCollapsed();
                      return (
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-slate-900">{primaryLine}</div>
                          {secondaryLine && (
                            <div className="text-xs text-slate-600">{secondaryLine}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 5. Runner Strip (When Allowed) */}
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
                    
                    {/* Message Button - Black Circle with Chat Icon */}
                    {allowContact && !isCompleted && !isCancelled && (
                      <button
                        onClick={() => navigate(`/customer/chat/${order.id}`)}
                        className="relative w-10 h-10 rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center transition-colors shrink-0"
                        aria-label="Message runner"
                      >
                        <MessageCircle className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                    )}
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
                <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Loader Animation - Same size as Avatar (md = lg = ~48px) */}
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <LottieComponent
                        animationData={runnerLoadingAnimationData}
                        loop={true}
                        autoplay={true}
                        style={{ width: '48px', height: '48px' }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-normal text-slate-900">
                        Benjamin is finding the best runner available to complete your order.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* OTP Display (when OTP is generated) - Collapsed State */}
            {shouldShowCustomerOtpToCustomer(order.status, !!order.otp_code) && order.otp_code && (
              <OtpDisplay otpCode={order.otp_code} customerStatusStep={customerStatus.step} />
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
            </div>
          ) : (
            /* EXPANDED STATE */
            <div className="space-y-6">
            {/* 1. Title and Sub Label - Grouped together (same as collapsed) */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{customerStatus.label}...</h2>
              <p className="text-sm text-slate-600 pt-[6px]">
                {customerStatus.step === 'ON_THE_WAY'
                  ? (() => {
                      const showRunnerIdentity = canRevealRunnerIdentity(order.status);
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
                  : getExpandedStatusCopy(order.status)}
              </p>
            </div>

            {/* 3. Progress Bar */}
            <DeliveryProgressBar currentStep={customerStatus.step} />

            {/* 4. Order Snapshot: Cash Amount, Total Payment, Delivery Address */}
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
              
              {/* Delivery Address - Expanded View (Same Format as Collapsed) */}
              <div className="pt-2 border-t border-neutral-100">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Delivery Address</div>
                  {(() => {
                    const { primaryLine, secondaryLine } = formatAddressForCollapsed();
                    return (
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-slate-900">{primaryLine}</div>
                        {secondaryLine && (
                          <div className="text-xs text-slate-600">{secondaryLine}</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 5. Runner Strip (When Allowed) */}
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
                  
                  {/* Message Button - Black Circle with Chat Icon */}
                  {allowContact && !isCompleted && !isCancelled && (
                    <button
                      onClick={() => navigate(`/customer/chat/${order.id}`)}
                      className="relative w-10 h-10 rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center transition-colors shrink-0"
                      aria-label="Message runner"
                    >
                      <MessageCircle className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
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
              <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Loader Animation - Same size as Avatar (md = lg = ~48px) */}
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <LottieComponent
                      animationData={runnerLoadingAnimationData}
                      loop={true}
                      autoplay={true}
                      style={{ width: '48px', height: '48px' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-normal text-slate-900">
                      Benjamin is finding the best runner available to complete your order.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* OTP Display (when OTP is generated) */}
            {shouldShowCustomerOtpToCustomer(order.status, !!order.otp_code) && order.otp_code && (
              <OtpDisplay otpCode={order.otp_code} customerStatusStep={customerStatus.step} />
            )}

            {/* Delivery Progress Timeline */}
            <div ref={progressTimelineRef} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Delivery Progress</h3>
              <OrderProgressTimeline
                currentStatus={order.status}
                variant="customer"
                tone="customer"
                currentStep={customerStatus.step}
                order={order}
              />
            </div>


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

            {/* Cancel Button - Standard Button with Red Stroke */}
            {canCancel && onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                size="default"
                className="w-full h-[56px] rounded-full border border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600"
              >
                Cancel Delivery
              </Button>
            )}

            {/* Order ID Footer */}
            <div className="text-center pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            </div>
          )}
      </div>
    </motion.div>
  );
}

