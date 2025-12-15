import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderWithDetails, OrderStatus } from '@/types/types';
import { getCustomerFacingStatus, getCustomerFacingStatusWithArrival } from '@/lib/customerStatus';
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
import { rateRunner, getOrderById, confirmCount } from '@/db/api';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { resolveDeliveryStyleFromOrder } from '@/lib/deliveryStyle';
import { ReportIssueSheet } from '@/components/customer/ReportIssueSheet';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import countConfirmationIllustration from '@/assets/illustrations/CountConfirmation.png';
import { useOrderRealtime } from '@/hooks/useOrdersRealtime';

// Loader component for runner assignment state
import LottieComponent from "lottie-react";
import runnerLoadingAnimationData from "@/assets/animations/runner-loader-green.json";

interface ActiveDeliverySheetProps {
  order: OrderWithDetails;
  isExpanded: boolean; // Kept for backward compatibility but not used
  onToggleExpand: () => void; // Kept for backward compatibility but not used
  onCancel?: () => void;
  onReorder?: () => void;
  onMessage?: () => void;
  onCallSupport?: () => void;
  onOrderUpdate?: (order: OrderWithDetails) => void;
  // No longer needed - map has fixed viewport
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
  const [submittingRating, setSubmittingRating] = useState(false);
  const [customerStatus, setCustomerStatus] = useState(getCustomerFacingStatus(order.status));
  const lastCheckedOrderRef = useRef<string | null>(null);
  const unreadCount = useUnreadMessages(order.id);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showCountGuardrail, setShowCountGuardrail] = useState(false);
  const [showCountIssueSheet, setShowCountIssueSheet] = useState(false);
  const [hasDismissedGuardrail, setHasDismissedGuardrail] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isConfirmingCount, setIsConfirmingCount] = useState(false);

  // COUNTED guardrail constants
  const COUNT_GUARDRAIL_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
  const makeGuardrailKey = (orderId: string) => `benjamin:count-guardrail:${orderId}`;
  
  // Local order state to handle realtime updates independently
  const [localOrder, setLocalOrder] = useState<OrderWithDetails>(order);

  // Sync localOrder when order prop changes (from parent)
  // This ensures we always reflect the parent's order state
  // Use a ref to track the last synced order to avoid unnecessary updates
  const lastSyncedOrderRef = useRef<string>('');
  useEffect(() => {
    // Create a unique key from order properties to detect changes
    const orderKey = `${order.id}-${order.status}-${order.updated_at || ''}`;
    
    // Only sync if order actually changed
    if (lastSyncedOrderRef.current !== orderKey) {
      console.log('[ActiveDeliverySheet] Order prop updated, syncing localOrder:', {
        orderId: order.id,
        status: order.status,
        updated_at: order.updated_at,
        previousKey: lastSyncedOrderRef.current,
        newKey: orderKey,
        timestamp: new Date().toISOString(),
      });
      
      // Always create a new object reference to ensure React detects the change
      setLocalOrder({ ...order });
      lastSyncedOrderRef.current = orderKey;
    }
  }, [order.id, order.status, order.updated_at, order]);

  // Subscribe to realtime updates for this order
  // This acts as a backup/fallback if parent doesn't receive updates
  // But we prioritize the parent's order prop as the source of truth
  useOrderRealtime(order.id, {
    onUpdate: async (updatedOrder) => {
      console.log('[ActiveDeliverySheet] Realtime update received:', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        updated_at: updatedOrder.updated_at,
        timestamp: new Date().toISOString(),
      });

      // Always notify parent first - parent is the source of truth
      // Fetch full order details to get relations (runner, address_snapshot, etc.)
      try {
        const fullOrder = await getOrderById(updatedOrder.id);
        if (fullOrder) {
          // Notify parent component of the update first
          // Parent will update its state and pass it back as order prop
          if (onOrderUpdate) {
            console.log('[ActiveDeliverySheet] Notifying parent of order update:', {
              orderId: fullOrder.id,
              status: fullOrder.status,
            });
            onOrderUpdate(fullOrder);
          }
          // Also update local state as fallback (in case parent doesn't update)
          setLocalOrder(fullOrder);
        } else {
          // Fallback: merge update into existing order
          const mergedOrder = {
            ...order,
            ...updatedOrder,
          } as OrderWithDetails;
          
          if (onOrderUpdate) {
            console.log('[ActiveDeliverySheet] Notifying parent of merged order update:', {
              orderId: mergedOrder.id,
              status: mergedOrder.status,
            });
            onOrderUpdate(mergedOrder);
          }
          setLocalOrder(mergedOrder);
        }
      } catch (error) {
        console.error('[ActiveDeliverySheet] Error fetching full order after realtime update:', error);
        // Fallback: merge update into existing order
        const mergedOrder = {
          ...order,
          ...updatedOrder,
        } as OrderWithDetails;
        
        if (onOrderUpdate) {
          console.log('[ActiveDeliverySheet] Notifying parent of merged order update (error fallback):', {
            orderId: mergedOrder.id,
            status: mergedOrder.status,
          });
          onOrderUpdate(mergedOrder);
        }
        setLocalOrder(mergedOrder);
      }
    },
    enabled: !!order.id,
  });

  // Debug: Log when order prop changes (for PWA troubleshooting)
  const prevOrderRef = useRef<OrderWithDetails | null>(null);
  useEffect(() => {
    const prevOrder = prevOrderRef.current;
    const hasChanged = !prevOrder || 
      prevOrder.status !== order.status || 
      prevOrder.updated_at !== order.updated_at ||
      prevOrder.id !== order.id;
    
    if (hasChanged) {
      console.log('[ActiveDeliverySheet] Order prop updated:', {
        orderId: order.id,
        status: order.status,
        updated_at: order.updated_at,
        previousStatus: prevOrder?.status,
        previousUpdatedAt: prevOrder?.updated_at,
        timestamp: new Date().toISOString(),
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
      });
      prevOrderRef.current = order;
    }
  }, [order]);

  // Check for runner arrival when status is Pending Handoff
  // Re-check whenever order updates (including when order_events change)
  useEffect(() => {
    const updateCustomerStatus = async () => {
      if (localOrder.status === 'Pending Handoff') {
        const status = await getCustomerFacingStatusWithArrival(localOrder.status, localOrder);
        setCustomerStatus(status);
        lastCheckedOrderRef.current = localOrder.id;
      } else {
        setCustomerStatus(getCustomerFacingStatus(localOrder.status));
        lastCheckedOrderRef.current = localOrder.id;
      }
    };
    updateCustomerStatus();
  }, [localOrder.status, localOrder.id, localOrder.updated_at, localOrder]);
  
  // Poll for arrival status periodically when in Pending Handoff
  // This ensures we catch arrival even if realtime subscription has issues
  // Uses a longer interval to avoid excessive API calls
  useEffect(() => {
    if (localOrder.status !== 'Pending Handoff' || !localOrder.id) return;
    
    // Initial check
    const checkArrival = async () => {
      const status = await getCustomerFacingStatusWithArrival(localOrder.status, localOrder);
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
  }, [localOrder.status, localOrder.id, localOrder]);

  // Subscribe to order_events for runner arrival updates
  useEffect(() => {
    if (localOrder.status !== 'Pending Handoff' || !localOrder.id) return;

    const orderId = localOrder.id; // Capture orderId in closure
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
  }, [localOrder.status, localOrder.id, localOrder, onOrderUpdate]);

  // Subscribe to OTP verification events to start count window immediately
  // NOTE: This is a backup - the primary trigger is otp_verified_at field check
  useEffect(() => {
    const deliveryStyle = resolveDeliveryStyleFromOrder(localOrder);
    if (deliveryStyle !== 'COUNTED' || !localOrder.id) return;

    const orderId = localOrder.id;
    const channelName = `order-events:${orderId}:otp-verified`;
    
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
          const event = payload.new;
          // Debug log all order_events for this order
          console.log('[ActiveDeliverySheet][OTP] order_event received', payload.new);
          
          // Check if this is an OTP VERIFICATION event (not generation)
          if (event && event.order_id === orderId) {
            const metadata = (event.metadata || {}) as any;
            const clientAction = (event.client_action_id || '') as string;
            const metaAction = (metadata.action || metadata.type || '') as string;

            // Only match OTP VERIFICATION events, not generation events
            const isOtpVerificationEvent =
              (/verify_otp/i.test(metaAction) || /verify_otp/i.test(clientAction)) &&
              !/generate_otp/i.test(metaAction) &&
              !/generate_otp/i.test(clientAction);

            if (!isOtpVerificationEvent) {
              return;
            }

            console.log('[ActiveDeliverySheet][OTP] ✅ OTP verification event detected, starting count window');

            const eventTime = event.created_at ? new Date(event.created_at).getTime() : Date.now();
            const expiresAt = eventTime + COUNT_GUARDRAIL_WINDOW_MS;
            const key = makeGuardrailKey(orderId);

            try {
              localStorage.setItem(key, JSON.stringify({ dismissed: false, expiresAt }));
              // Don't set showCountGuardrail here - let the main effect handle it based on otp_verified_at
            } catch (e) {
              console.warn('[ActiveDeliverySheet][OTP] Failed to persist guardrail start', e);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ActiveDeliverySheet] ✅ Subscribed to OTP verification events for order ${orderId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [localOrder.id]);
  const showRunnerIdentity = canRevealRunnerIdentity(localOrder.status);
  const allowContact = canContactRunner(localOrder.status);
  const isFinal = isOrderFinal(localOrder.status);
  const canCancel = localOrder.status === "Pending" || localOrder.status === "Runner Accepted";
  const isCompleted = localOrder.status === "Completed";
  const isCancelled = localOrder.status === "Cancelled";

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
    if (!localOrder.id || localOrder.runner_rating) return;
    
    setSubmittingRating(true);
    try {
      await rateRunner(localOrder.id, rating);
      toast.success('Rating submitted successfully');
      // Update order state with new rating
      const updatedOrder = {
        ...localOrder,
        runner_rating: rating,
      };
      setLocalOrder(updatedOrder);
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
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
    if (localOrder.status !== 'Cash Withdrawn' && localOrder.status !== 'Pending Handoff') {
      return null;
    }

    // If cash was withdrawn, estimate 5-10 minutes from withdrawal time
    // Don't show ETA if runner has already arrived
    if (localOrder.cash_withdrawn_at && customerStatus.step !== 'ARRIVED') {
      const withdrawnTime = new Date(localOrder.cash_withdrawn_at);
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
    const address = localOrder.address_snapshot;
    
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
    } else if (localOrder.customer_address) {
      // Fallback to customer_address - extract first line
      const parts = localOrder.customer_address.split(',');
      streetLine = abbreviateStreet(parts[0]?.trim() || '');
      if (streetLine.length > 28) {
        streetLine = streetLine.substring(0, 25) + '…';
      }
    }
    
    // Get city/state line
    let cityLine = '';
    if (address?.city && address?.state) {
      cityLine = `${address.city}, ${address.state}`;
    } else if (localOrder.customer_address) {
      // Try to extract city/state from customer_address
      const parts = localOrder.customer_address.split(',');
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
        primaryLine: localOrder.customer_address || 'Address not available',
        secondaryLine: ''
      };
    }
  };

  const estimatedArrival = calculateEstimatedArrival();


  // COUNTED delivery guardrail logic - driven by OTP verification, persists for 3 minutes
  useEffect(() => {
    const deliveryStyle = resolveDeliveryStyleFromOrder(localOrder);
    if (deliveryStyle !== 'COUNTED' || localOrder.status === 'Cancelled') {
      setShowCountGuardrail(false);
      setHasDismissedGuardrail(false);
      return;
    }

    const key = makeGuardrailKey(localOrder.id);

    const parseStored = () => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as { dismissed?: boolean; expiresAt?: number };
      } catch (e) {
        console.warn('[ActiveDeliverySheet] Failed to parse count guardrail state', e);
        return null;
      }
    };

    const stored = parseStored();
    const otpVerifiedAt = (localOrder as any).otp_verified_at;
    
    // CRITICAL: Only show guardrail when OTP is VERIFIED, not when it's generated
    // OTP is verified when:
    // 1. otp_verified_at is set (runner successfully entered the OTP code)
    // 2. Status is "Pending Handoff" (for COUNTED, this means OTP verified but delivery not completed)
    // 
    // OTP is generated when:
    // - otp_code exists but otp_verified_at is null
    // - Status is "Pending Handoff" but OTP not verified yet
    const isOtpVerified = !!otpVerifiedAt && localOrder.status === 'Pending Handoff';
    
    let expiresAt: number | null = null;
    let windowStartTime: number | null = null;
    
    if (isOtpVerified) {
      // OTP was verified by runner - use this as the window start time
      windowStartTime = new Date(otpVerifiedAt).getTime();
      expiresAt = windowStartTime + COUNT_GUARDRAIL_WINDOW_MS;
      
      console.log('[ActiveDeliverySheet][Guardrail] ✅ OTP verified by runner, starting count window:', {
        orderId: localOrder.id,
        otpVerifiedAt,
        status: localOrder.status,
        windowStartTime: new Date(windowStartTime).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      });
      
      // If we have a stored window but otp_verified_at is more recent, update it
      if (!stored || !stored.expiresAt || stored.expiresAt < expiresAt) {
        try {
          localStorage.setItem(key, JSON.stringify({ dismissed: false, expiresAt }));
        } catch {
          // ignore
        }
      }
    } else if (stored && stored.expiresAt) {
      // Check if stored window is still valid (OTP was verified when it was created)
      // Only use stored window if we're still in Pending Handoff (OTP verified but not completed)
      if (localOrder.status === 'Pending Handoff' || localOrder.status === 'Completed') {
        expiresAt = stored.expiresAt;
        console.log('[ActiveDeliverySheet][Guardrail] Using stored window (from previous OTP verification):', {
          orderId: localOrder.id,
          status: localOrder.status,
          expiresAt: new Date(expiresAt).toISOString(),
        });
      } else {
        // Order status changed, clear stored window
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        setShowCountGuardrail(false);
        setHasDismissedGuardrail(false);
        return;
      }
    } else {
      // OTP not verified yet (otp_verified_at is null or status is not Pending Handoff)
      // Don't show guardrail
      setShowCountGuardrail(false);
      setHasDismissedGuardrail(false);
      return;
    }

    if (!expiresAt) {
      // Should not happen, but safety check
      setShowCountGuardrail(false);
      setHasDismissedGuardrail(false);
      return;
    }

    const now = Date.now();
    const { dismissed } = stored || {};

    // If window already expired, mark as dismissed and hide
    if (now > expiresAt || dismissed) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ dismissed: true, expiresAt })
        );
      } catch {
        // ignore
      }
      setShowCountGuardrail(false);
      setHasDismissedGuardrail(true);
      return;
    }

    // Window is active → show guardrail until it expires or user dismisses
    setShowCountGuardrail(true);
    setHasDismissedGuardrail(false);

    // Calculate initial countdown
    const remainingMs = expiresAt - now;
    setCountdownSeconds(Math.max(0, Math.floor(remainingMs / 1000)));

    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ dismissed: true, expiresAt })
        );
      } catch {
        // ignore
      }
      setShowCountGuardrail(false);
      setHasDismissedGuardrail(true);
      setCountdownSeconds(null);
    }, expiresAt - now);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localOrder.id, localOrder.status, (localOrder as any).otp_verified_at]);

  // Countdown timer - update every second when guardrail is active
  useEffect(() => {
    if (!showCountGuardrail || countdownSeconds === null) {
      setCountdownSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      const key = makeGuardrailKey(localOrder.id);
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        const expiresAt = parsed?.expiresAt;
        
        if (!expiresAt) {
          setCountdownSeconds(null);
          return;
        }

        const now = Date.now();
        const remainingMs = expiresAt - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        
        setCountdownSeconds(remainingSeconds);
        
        if (remainingSeconds === 0) {
          setCountdownSeconds(null);
        }
      } catch {
        setCountdownSeconds(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showCountGuardrail, countdownSeconds, localOrder.id]);

  // Auto-close sheet and navigate to home when SPEED order is completed (immediately after OTP verification)
  useEffect(() => {
    const deliveryStyle = resolveDeliveryStyleFromOrder(localOrder);
    if (deliveryStyle === 'SPEED' && localOrder.status === 'Completed') {
      console.log('[ActiveDeliverySheet] SPEED order completed, navigating to home immediately');
      // Navigate to home immediately for speed deliveries
      navigate('/customer/home', { replace: true });
    }
  }, [localOrder.id, localOrder.status, navigate]);

  // Auto-close sheet and navigate to home when COUNTED order is completed and 3-minute window has expired
  useEffect(() => {
    const deliveryStyle = resolveDeliveryStyleFromOrder(localOrder);
    if (deliveryStyle !== 'COUNTED' || localOrder.status !== 'Completed') {
      return;
    }

    const key = makeGuardrailKey(localOrder.id);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const expiresAt = parsed?.expiresAt;
      
      if (!expiresAt) {
        // No window stored, order might have been completed before OTP was verified
        // Navigate to home after a short delay
        const timeout = setTimeout(() => {
          navigate('/customer/home', { replace: true });
        }, 1000);
        return () => clearTimeout(timeout);
      }

      const now = Date.now();
      const remainingMs = expiresAt - now;

      if (remainingMs <= 0) {
        // Window has expired and order is completed - navigate to home
        console.log('[ActiveDeliverySheet] COUNTED order completed and 3-minute window expired, navigating to home');
        navigate('/customer/home', { replace: true });
        return;
      }

      // Window hasn't expired yet - set timeout to navigate when it does
      const timeout = setTimeout(() => {
        console.log('[ActiveDeliverySheet] COUNTED order completed and 3-minute window expired, navigating to home');
        navigate('/customer/home', { replace: true });
      }, remainingMs);

      return () => clearTimeout(timeout);
    } catch (error) {
      console.error('[ActiveDeliverySheet] Error checking count window expiration:', error);
      // On error, navigate to home after a short delay
      const timeout = setTimeout(() => {
        navigate('/customer/home', { replace: true });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [localOrder.id, localOrder.status, navigate]);


  return (
    <div
      className={cn(
        'absolute inset-x-0 top-[50vh] bottom-0 z-20 bg-white rounded-t-[24px] shadow-2xl',
        'pointer-events-auto flex flex-col',
        'overflow-hidden' // Container doesn't scroll, only inner content
      )}
    >
      {/* Sheet Content - Always scrollable */}
      <div
        ref={scrollContainerRef}
        className="px-6 pt-6 w-full overflow-y-auto overflow-x-hidden flex-1 pb-6"
      >
        <div className="space-y-6">
          {/* 1. Title and Sub Label - Grouped together */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{customerStatus.label}...</h2>
            <p className="text-sm text-slate-600 pt-[6px]">
              {customerStatus.step === 'ON_THE_WAY'
                ? (() => {
                    const runnerName = showRunnerIdentity && localOrder.runner 
                      ? getRunnerDisplayName(
                          (localOrder.runner as any)?.first_name,
                          (localOrder.runner as any)?.last_name,
                          localOrder.status
                        )
                      : 'Your runner';
                    return `Your order is on the move! ${runnerName} has your cash and is heading your way.`;
                  })()
                : customerStatus.step === 'ARRIVED'
                ? 'Your runner has arrived. Please meet up and share your verification code to receive your cash.'
                : getExpandedStatusCopy(localOrder.status)}
            </p>
          </div>

          {/* 2. Progress Bar */}
          <DeliveryProgressBar currentStep={customerStatus.step} />

          {/* 2.5. OTP Display (when runner is on the way) - Higher priority, shown before order snapshot */}
          {customerStatus.step === 'ON_THE_WAY' && shouldShowCustomerOtpToCustomer(localOrder.status, !!localOrder.otp_code) && localOrder.otp_code && (
            <OtpDisplay otpCode={localOrder.otp_code} customerStatusStep={customerStatus.step} />
          )}

          {/* 2.75. Runner Strip (When Allowed) - Shown right after OTP, before order snapshot */}
          {showRunnerIdentity && localOrder.runner ? (
            <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={localOrder.runner.avatar_url || undefined}
                  fallback={localOrder.runner.first_name || 'Runner'}
                  size="md"
                  className={cn(
                    "transition-all duration-300",
                    shouldBlurRunnerAvatar(localOrder.status) && "blur-sm"
                  )}
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {localOrder.runner.first_name || 'Runner'}
                    {localOrder.runner.last_name && ` ${localOrder.runner.last_name}`}
                  </p>
                  <p className="text-xs text-slate-500">Your Benjamin runner</p>
                </div>
                
                {/* Message Button - Canonical IconButton */}
                {allowContact && !isCompleted && !isCancelled && (
                  <IconButton
                    onClick={() => navigate(`/customer/chat/${localOrder.id}`)}
                    className="relative shrink-0"
                    aria-label="Message runner"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </IconButton>
                )}
              </div>
              
              {/* Runner Fun Fact */}
              {localOrder.runner.first_name && (localOrder.runner as any)?.fun_fact && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-blue-900 leading-relaxed">
                    <span className="font-medium">{localOrder.runner.first_name}</span>
                    {' — '}
                    {(localOrder.runner as any).fun_fact}
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

          {/* 3. Order Snapshot: Cash Amount, Total Payment, Delivery Address */}
          <div className="rounded-2xl bg-white border border-black/5 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Cash Amount</div>
                <div className="text-lg font-semibold text-slate-900">${localOrder.requested_amount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Total Payment</div>
                <div className="text-lg font-semibold text-slate-900">${localOrder.total_payment.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Delivery Address */}
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

          {/* 4. OTP Display (when OTP is generated, but not when runner is on the way - that's shown above) */}
          {customerStatus.step !== 'ON_THE_WAY' && shouldShowCustomerOtpToCustomer(localOrder.status, !!localOrder.otp_code) && localOrder.otp_code && (
            <OtpDisplay otpCode={localOrder.otp_code} customerStatusStep={customerStatus.step} />
          )}

          {/* 6. Delivery Progress Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Delivery Progress</h3>
            <OrderProgressTimeline
              currentStatus={localOrder.status}
              variant="customer"
              tone="customer"
              currentStep={customerStatus.step}
              order={localOrder}
            />
          </div>

          {/* 7. Rate Your Runner (Completed Only) - Hidden while guardrail is active */}
          {isCompleted && !showCountGuardrail && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">Rate your runner</div>
              <RatingStars
                value={localOrder.runner_rating ?? 0}
                onChange={localOrder.runner_rating ? undefined : handleRateRunner}
                readOnly={!!localOrder.runner_rating || submittingRating}
              />
            </div>
          )}

          {/* 8. Reorder CTA (Completed Only) - Hidden while guardrail is active */}
          {isCompleted && !showCountGuardrail && onReorder && (
            <Button
              onClick={onReorder}
              className="w-full rounded-2xl bg-black text-white hover:bg-black/90 h-12"
            >
              Reorder this delivery
            </Button>
          )}

          {/* 9. Cancel Button - Standard Button with Red Stroke */}
          {canCancel && onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              size="default"
              className="w-full h-[56px] border border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600"
            >
              Cancel Delivery
            </Button>
          )}

          {/* 10. Order ID Footer */}
          <div className="text-center pt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
              Order #{localOrder.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* ReportIssueSheet for COUNTED guardrail */}
      <ReportIssueSheet
        open={showCountIssueSheet}
        order={localOrder}
        onClose={() => {
          setShowCountIssueSheet(false);
          setShowCountGuardrail(false);
          setHasDismissedGuardrail(true);
          try {
            const key = makeGuardrailKey(localOrder.id);
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : {};
            const expiresAt = parsed?.expiresAt ?? Date.now();
            localStorage.setItem(
              key,
              JSON.stringify({ ...parsed, dismissed: true, expiresAt })
            );
          } catch (e) {
            console.warn('[ActiveDeliverySheet] Failed to persist guardrail dismissal', e);
          }
        }}
        initialCategory="CASH_AMOUNT"
        lockCategory={true}
      />

      {/* COUNTED guardrail modal overlay */}
      {showCountGuardrail && !isCancelled && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white shadow-xl relative overflow-hidden">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <IconButton
                type="button"
                variant="default"
                size="lg"
                onClick={() => {
                  setShowCountGuardrail(false);
                  setHasDismissedGuardrail(true);
                  try {
                    const key = makeGuardrailKey(localOrder.id);
                    const raw = localStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : {};
                    const expiresAt = parsed?.expiresAt ?? Date.now();
                    localStorage.setItem(
                      key,
                      JSON.stringify({ ...parsed, dismissed: true, expiresAt })
                    );
                  } catch (e) {
                    console.warn('[ActiveDeliverySheet] Failed to persist guardrail dismissal', e);
                  }
                }}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-900" />
              </IconButton>
            </div>

            {/* Illustration frame - 6px from top and sides */}
            <div className="w-full px-[6px] pt-[6px]">
              <div
                className="w-full h-[260px] flex items-center justify-center rounded-[18px]"
              >
                <div className="w-[193px] h-[193px] flex items-center justify-center overflow-hidden rounded-[18px]">
                  <img
                    src={countConfirmationIllustration}
                    alt="Count confirmation"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Content - with 24px padding on sides and bottom */}
            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  How did the count go?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Count your cash with the runner. If anything&apos;s off, we&apos;ll handle it.
                </p>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  You&apos;ll have about 3 minutes to flag any issue for this delivery.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    // Close guardrail modal and dismiss it
                    setShowCountGuardrail(false);
                    setHasDismissedGuardrail(true);
                    try {
                      const key = makeGuardrailKey(localOrder.id);
                      const raw = localStorage.getItem(key);
                      const parsed = raw ? JSON.parse(raw) : {};
                      const expiresAt = parsed?.expiresAt ?? Date.now();
                      localStorage.setItem(
                        key,
                        JSON.stringify({ ...parsed, dismissed: true, expiresAt })
                      );
                    } catch (e) {
                      console.warn('[ActiveDeliverySheet] Failed to persist guardrail dismissal', e);
                    }
                    // Open the issue report sheet
                    setShowCountIssueSheet(true);
                  }}
                  className="flex-1 h-14 text-base font-semibold text-white"
                  style={{ backgroundColor: '#E84855' }}
                >
                  Incorrect Amount
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (isConfirmingCount) return; // Prevent double-clicks
                    
                    setIsConfirmingCount(true);
                    console.log('[ActiveDeliverySheet] Customer confirmed count is correct, completing order immediately:', {
                      orderId: localOrder.id,
                      status: localOrder.status,
                    });
                    
                    try {
                      // Complete the order immediately - customer confirmation overrides runner cooling off period
                      const result = await confirmCount(localOrder.id);
                      
                      if (result.success) {
                        console.log('[ActiveDeliverySheet] Order completed successfully via customer confirmation');
                        
                        // Close guardrail modal
                        setShowCountGuardrail(false);
                        setHasDismissedGuardrail(true);
                        
                        // Persist dismissal
                        try {
                          const key = makeGuardrailKey(localOrder.id);
                          const raw = localStorage.getItem(key);
                          const parsed = raw ? JSON.parse(raw) : {};
                          const expiresAt = parsed?.expiresAt ?? Date.now();
                          localStorage.setItem(
                            key,
                            JSON.stringify({ ...parsed, dismissed: true, expiresAt })
                          );
                        } catch (e) {
                          console.warn('[ActiveDeliverySheet] Failed to persist guardrail dismissal', e);
                        }
                        
                        // Navigate to home page - order is now completed
                        // The order will update via realtime, and the sheet will auto-close
                        navigate('/customer/home', { replace: true });
                      } else {
                        console.error('[ActiveDeliverySheet] Failed to confirm count:', result.error);
                        toast.error(result.error || 'Failed to complete order. Please try again.');
                        setIsConfirmingCount(false);
                      }
                    } catch (error: any) {
                      console.error('[ActiveDeliverySheet] Error confirming count:', error);
                      toast.error(error?.message || 'An unexpected error occurred. Please try again.');
                      setIsConfirmingCount(false);
                    }
                  }}
                  disabled={isConfirmingCount}
                  className="flex-1 h-14 text-base font-semibold bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfirmingCount ? 'Completing...' : 'Looks Correct'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}
    </div>
  );
}

