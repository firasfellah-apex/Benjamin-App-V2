import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getOrderById, cancelOrder, hasOrderIssue } from "@/db/api";
import { useOrderRealtime, useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import type { OrderWithDetails, OrderStatus, Order } from "@/types/types";
import { CustomerOrderMap } from "@/components/order/CustomerOrderMap";
import { RunnerDirectionsMap } from "@/components/maps/RunnerDirectionsMap";
import { getDummyLocations } from "@/components/maps/RunnerDirectionsMap";
import { triggerConfetti } from "@/lib/confetti";
import { strings } from "@/lib/strings";
import { ActiveDeliverySheet } from "@/components/customer/ActiveDeliverySheet";
import { CompletionRatingModal } from "@/components/customer/CompletionRatingModal";
import { canShowLiveLocation } from "@/lib/reveal";

interface OrderTrackingProps {
  orderId?: string; // Optional prop, falls back to params
}

export default function OrderTracking({ orderId: orderIdProp }: OrderTrackingProps = {}) {
  const params = useParams<{ orderId?: string; deliveryId?: string }>();
  // Use prop if provided, otherwise try orderId param, then deliveryId param
  const orderId = orderIdProp || params.orderId || params.deliveryId;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [previousStatus, setPreviousStatus] = useState<OrderStatus | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false); // Kept for backward compatibility but not used
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasIssue, setHasIssue] = useState(false);
  
  // Check if we should restore fullscreen mode (e.g., returning from chat)
  const [isMapFullscreen, setIsMapFullscreen] = useState(() => {
    const state = location.state as { restoreFullscreen?: boolean } | null;
    return state?.restoreFullscreen ?? false;
  });
  
  // Track viewport height for computing sheet inset
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // In half-screen mode the bottom sheet covers ~50vh.
  // Add breathing room so map UI sits above the sheet edge.
  const halfSheetPx = useMemo(() => Math.round(viewportH * 0.5), [viewportH]);
  const uiBottomInset = isMapFullscreen ? 0 : halfSheetPx;

  // Use React Query as the single source of truth for order data
  const { data: order, isLoading: loading, dataUpdatedAt } = useQuery<OrderWithDetails | null>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const data = await getOrderById(orderId);
      console.log('[OrderTracking] Query function fetched order:', {
        orderId: data?.id,
        status: data?.status,
        timestamp: new Date().toISOString(),
      });
      // Always return a new object reference
      return data ? { ...data } : null;
    },
    enabled: !!orderId,
    staleTime: 0, // Always consider stale to allow realtime updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Refetch on window focus to catch any missed updates
    refetchOnWindowFocus: false, // Disable to avoid unnecessary refetches
    // Ensure we get notified of data changes
    notifyOnChangeProps: ['data', 'error', 'status', 'dataUpdatedAt'],
  });
  
  // Debug: Log when order data changes
  useEffect(() => {
    if (order) {
      console.log('[OrderTracking] useQuery order data changed:', {
        orderId: order.id,
        status: order.status,
        updated_at: order.updated_at,
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
        timestamp: new Date().toISOString(),
      });
    }
  }, [order?.id, order?.status, order?.updated_at, dataUpdatedAt, order]);

  // Track status transitions for confetti and modal
  useEffect(() => {
    if (!order) return;
    
    // Trigger confetti on completion
    if (previousStatus && previousStatus !== "Completed" && order.status === "Completed") {
      triggerConfetti(3000);
      toast.success(strings.toasts.pinVerified);
    }
    
    const wasCompleted = previousStatus === "Completed";
    const isNowCompleted = order.status === "Completed";
    setPreviousStatus(order.status);
    
    // Check if order has a reported issue
    if (isNowCompleted) {
      hasOrderIssue(order.id).then(issueExists => {
        setHasIssue(issueExists);
      });
    }
    
    // Show completion modal if order is completed and hasn't been rated and no issue reported
    if (isNowCompleted && !order.runner_rating) {
      hasOrderIssue(order.id).then(issueExists => {
        setHasIssue(issueExists);
        if (!issueExists) {
          if (!wasCompleted) {
            // Just transitioned to completed - show after confetti
            setTimeout(() => {
              setShowCompletionModal(true);
            }, 1000);
          } else if (!showCompletionModal) {
            // Already completed on initial load - show after page loads
            setTimeout(() => {
              setShowCompletionModal(true);
            }, 500);
          }
        }
      });
    }
  }, [order?.status, order?.id, previousStatus, order?.runner_rating]);

  // Handle realtime updates for this specific order
  // Update React Query cache immediately, then refresh in background for full relations
  const handleOrderUpdate = useCallback(async (updatedOrder: Order, oldOrder?: Order) => {
    if (!orderId || !updatedOrder || updatedOrder.id !== orderId) return;
    
    console.log('[OrderTracking] Realtime update received:', {
      orderId: updatedOrder.id,
      oldStatus: oldOrder?.status,
      newStatus: updatedOrder.status,
      runnerId: updatedOrder.runner_id,
      mode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      timestamp: new Date().toISOString(),
    });
    
    const currentCacheData = queryClient.getQueryData<OrderWithDetails | null>(['order', orderId]);
    
    // CRITICAL: If runner was just assigned and we don't have runner object,
    // fetch full order FIRST before updating cache to avoid showing "Runner" placeholder
    const runnerJustAssigned = (
      updatedOrder.runner_id &&
      (!currentCacheData?.runner_id || currentCacheData.runner_id !== updatedOrder.runner_id)
    );
    
    if (runnerJustAssigned) {
      console.log('[OrderTracking] Runner just assigned, fetching full order with runner data FIRST');
      try {
        const fullData = await getOrderById(orderId);
        if (fullData && fullData.id === orderId) {
          console.log('[OrderTracking] Got full order with runner data:', {
            orderId: fullData.id,
            status: fullData.status,
            hasRunner: !!fullData.runner,
            runnerFirstName: fullData.runner?.first_name || 'N/A',
            runnerAvatarUrl: fullData.runner?.avatar_url || 'N/A',
          });
          // Update cache with complete data including runner
          queryClient.setQueryData(['order', orderId], { ...fullData });
          return; // Done - we have complete data
        }
      } catch (error) {
        console.error('[OrderTracking] Error fetching full order details:', error);
        // Fall through to update with partial data
      }
    }
    
    // Update React Query cache immediately with payload data for instant UI update
    // CRITICAL: Always create a completely new object to ensure React Query detects the change
    if (currentCacheData && currentCacheData.id === updatedOrder.id) {
      // Create a completely new object with all nested objects also new references
      // This ensures React Query detects the change and triggers re-renders
      const merged: OrderWithDetails = {
        ...currentCacheData,
        ...updatedOrder,
        updated_at: updatedOrder.updated_at || currentCacheData.updated_at,
        // Preserve relations but create new references
        runner: currentCacheData.runner ? { ...currentCacheData.runner } : undefined,
        customer: currentCacheData.customer ? { ...currentCacheData.customer } : undefined,
        address_snapshot: currentCacheData.address_snapshot ? { ...currentCacheData.address_snapshot } : undefined,
      };
      
      console.log('[OrderTracking] Updating query cache (merged):', {
        orderId: merged.id,
        status: merged.status,
        hasRunner: !!merged.runner,
        runnerFirstName: merged.runner?.first_name || 'N/A',
      });
      
      queryClient.setQueryData<OrderWithDetails | null>(['order', orderId], () => merged);
    } else {
      console.log('[OrderTracking] No previous order in cache, will fetch');
    }
    
    // Fetch full order details in background to hydrate relations (runner, address_snapshot, etc.)
    getOrderById(orderId).then((data) => {
      if (data && data.id === orderId) {
        console.log('[OrderTracking] Full order details fetched, updating cache:', {
          orderId: data.id,
          status: data.status,
          hasRunner: !!data.runner,
          runnerFirstName: data.runner?.first_name || 'N/A',
        });
        queryClient.setQueryData(['order', orderId], { ...data });
      }
    }).catch((error) => {
      console.error('[OrderTracking] Error fetching full order details:', error);
    });
  }, [orderId, queryClient]);

  // Subscribe to realtime updates for this order
  // CRITICAL FIX: Use customer orders subscription instead of single order subscription
  // This avoids CHANNEL_ERROR issues with single order filters
  // We filter client-side to match the specific orderId
  useOrdersRealtime({
    filter: { mode: 'customer', customerId: user?.id || '' },
    onUpdate: (updatedOrder: Order) => {
      // Only process updates for the order we're tracking
      if (updatedOrder.id === orderId) {
        handleOrderUpdate(updatedOrder);
      }
    },
    enabled: !!orderId && !!user?.id && !loading, // Only enable after initial load and when we have user
  });

  // Debug logging for subscription status
  useEffect(() => {
    if (orderId) {
      console.log('[OrderTracking] Realtime subscription status:', {
        orderId,
        enabled: !!orderId && !loading,
        loading,
        hasOrder: !!order,
        orderStatus: order?.status,
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        timestamp: new Date().toISOString(),
      });
    }
    return () => {
      if (orderId) {
        console.log('[OrderTracking] Realtime subscription unmounting', { orderId });
      }
    };
  }, [orderId, loading, order?.status]);

  const handleCancel = async () => {
    if (!orderId || !order) {
      toast.error("Order not found");
      return;
    }

    // Prevent double-click
    if (isCancelling) {
      return;
    }

    // Validate status client-side for better UX
    if (order.status === "Runner at ATM" || order.status === "Cash Withdrawn" || order.status === "Pending Handoff") {
      toast.error("Cannot cancel order at this stage");
      return;
    }

    if (order.status === "Completed") {
      toast.error("Cannot cancel a completed order");
      return;
    }

    if (order.status === "Cancelled") {
      toast.error("Order is already cancelled");
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelOrder(orderId, "Cancelled by customer");
      if (result.success) {
        toast.success(result.message || strings.toasts.orderCanceled);
        // Update React Query cache immediately for instant UI feedback
        queryClient.setQueryData<OrderWithDetails | null>(['order', orderId], (prev) => {
          if (!prev) return prev;
          return { ...prev, status: 'Cancelled' as OrderStatus };
        });
        // Invalidate to ensure fresh data on next fetch
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        // Navigate back to home immediately (CustomerOrderDetailPage will also handle this via realtime)
        navigate("/customer/home", { replace: true });
      } else {
        toast.error(result.message || "Failed to cancel order");
        setIsCancelling(false);
      }
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error?.message || strings.errors.generic);
      setIsCancelling(false);
    }
  };

  const handleMessage = () => {
    if (!orderId) return;
    // Navigate to chat with state indicating where we came from
    navigate(`/customer/chat/${orderId}`, { 
      state: { fromFullscreen: isMapFullscreen } 
    });
  };

  const handleCallSupport = () => {
    // TODO: Integrate masked calling or tel: link
    toast.info("Calling feature coming soon");
  };

  const handleReorder = () => {
    // Navigate to request cash with pre-filled data
    navigate("/customer/request", {
      state: {
        reorder: true,
        amount: order?.requested_amount,
        addressId: order?.address_id,
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="text-muted-foreground">{strings.emptyStates.loading}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#F5F5F7]">
        <div className="text-muted-foreground">{strings.errors.orderNotFound}</div>
        <Button onClick={() => navigate("/customer/home")}>
          {strings.customer.trackingBackButton}
        </Button>
      </div>
    );
  }

  const showLiveMap = canShowLiveLocation(order.status);
  
  // Get map locations based on order status - MUST match runner map exactly
  // Customer only sees map after cash withdrawal (when live location is revealed)
  // Uses the SAME real locations as runner (pickup_lat/lng for ATM, custom_pin or address_snapshot for customer)
  const getMapLocations = () => {
    if (!showLiveMap) return null;
    
    // Customer map only shows route from ATM to customer (after cash withdrawal)
    // This should match runner's map when status is Cash Withdrawn / Pending Handoff / Completed
    const showCustomerRoute = ['Cash Withdrawn', 'Pending Handoff', 'Completed'].includes(order.status);
    
    if (showCustomerRoute) {
      // Get pickup location (ATM) - same as runner uses
      const hasPickup = !!(order as any).pickup_lat && !!(order as any).pickup_lng;
      const pickupLocation = hasPickup
        ? {
            lat: (order as any).pickup_lat,
            lng: (order as any).pickup_lng,
            address: (order as any).pickup_address || (order as any).pickup_name || 'ATM Location',
          }
        : null;
      
      // Get dropoff location (customer) - same as runner uses
      // Priority: custom_pin_lat/lng > latitude/longitude from address_snapshot
      const addressSnapshot = order.address_snapshot;
      const dropoffLocation = 
        (addressSnapshot?.custom_pin_lat && addressSnapshot?.custom_pin_lng)
          ? {
              lat: addressSnapshot.custom_pin_lat,
              lng: addressSnapshot.custom_pin_lng,
              address: order.address_snapshot?.line1 
                ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city || ''}, ${order.address_snapshot.state || ''}`
                : order.customer_address || 'Customer Address',
            }
          : (addressSnapshot?.latitude && addressSnapshot?.longitude)
            ? {
                lat: addressSnapshot.latitude,
                lng: addressSnapshot.longitude,
                address: order.address_snapshot?.line1 
                  ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city || ''}, ${order.address_snapshot.state || ''}`
                  : order.customer_address || 'Customer Address',
              }
            : null;
      
      if (pickupLocation && dropoffLocation) {
        return {
          origin: pickupLocation,
          destination: dropoffLocation,
          title: 'Route to You',
        };
      }
      
      // Fallback to dummy locations if real locations are not available
      console.warn('[OrderTracking] Missing real locations, using dummy locations as fallback', {
        hasPickup,
        hasDropoff: !!dropoffLocation,
        orderId: order.id,
      });
      const dummyLocations = getDummyLocations();
      return {
        origin: pickupLocation || dummyLocations.atm,
        destination: dropoffLocation || dummyLocations.customer,
        title: 'Route to You',
      };
    }
    
    return null;
  };

  const mapLocations = getMapLocations();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F5F5F7]">
      {/* Back Button - Fixed Top Left - Only visible in half-screen mode */}
      {/* In fullscreen, user uses the shrink button to return */}
      {!isMapFullscreen && (
        <div className="absolute top-6 left-6 z-30">
          <IconButton
            onClick={() => navigate("/customer/home")}
            variant="default"
            size="lg"
            className="bg-white/95 backdrop-blur shadow-lg"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </IconButton>
        </div>
      )}

      {/* Map Background - Always full screen, "half screen" is just the sheet covering bottom */}
      <div className={cn("absolute inset-0", isMapFullscreen ? "z-[100]" : "z-0")}>
        {mapLocations ? (
          <RunnerDirectionsMap
            origin={mapLocations.origin}
            destination={mapLocations.destination}
            title={mapLocations.title}
            height="100%"
            bottomPadding={24}
            uiBottomInset={uiBottomInset}
            interactive={true}
            showRecenterButton
            showLayerSwitcher
            showFullscreenToggle
            originAvatarUrl={order?.runner?.avatar_url}
            destinationAvatarUrl={profile?.avatar_url}
            pinCode={order?.otp_code || undefined}
            isFullscreen={isMapFullscreen}
            onFullscreenToggle={() => setIsMapFullscreen(v => !v)}
            onMessage={handleMessage}
            orderId={orderId}
          />
        ) : (
          <CustomerOrderMap
            orderStatus={order.status}
            customerLocation={{
              lat: order.address_snapshot?.latitude || 40.7128,
              lng: order.address_snapshot?.longitude || -74.0060,
              address: order.customer_address || ''
            }}
            estimatedArrival={showLiveMap ? "5 minutes" : undefined}
            className="h-full pointer-events-none"
            isFullscreen={isMapFullscreen}
          />
        )}
      </div>

      {/* Gradient Overlay for Readability - hidden in fullscreen */}
      {!isMapFullscreen && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 z-10 pointer-events-none" />
      )}

      {/* Completion Rating Modal - Only show if no issue was reported */}
      {!hasIssue && (
        <CompletionRatingModal
          order={order}
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onRated={() => {
            // Invalidate query to refresh order with updated rating
            if (orderId) {
              queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            }
          }}
        />
      )}

      {/* Bottom Sheet Container - Slides down/up when toggling fullscreen */}
      {/* ActiveDeliverySheet has its own absolute positioning (top-[50vh] bottom-0) */}
      {/* Wrapper is pointer-events-none so clicks pass through to map; sheet handles its own events */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none"
        initial={false}
        animate={{
          y: isMapFullscreen ? "50vh" : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        style={{
          willChange: "transform",
        }}
      >
        <ActiveDeliverySheet
          order={order}
          isExpanded={false}
          onToggleExpand={() => {}}
          onCancel={handleCancel}
          onReorder={handleReorder}
          onMessage={handleMessage}
          onCallSupport={handleCallSupport}
          onOrderUpdate={(updatedOrder) => {
            queryClient.setQueryData(["order", orderId], updatedOrder);
          }}
          isCancelling={isCancelling}
        />
      </motion.div>
    </div>
  );
}
