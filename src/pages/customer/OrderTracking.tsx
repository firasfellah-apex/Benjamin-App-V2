import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrderById, cancelOrder, hasOrderIssue } from "@/db/api";
import { useOrderRealtime } from "@/hooks/useOrdersRealtime";
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
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<OrderStatus | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasIssue, setHasIssue] = useState(false);
  const [mapBottomPadding, setMapBottomPadding] = useState<number>(260); // sensible default

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    
    // Trigger confetti on completion
    if (data && previousStatus && previousStatus !== "Completed" && data.status === "Completed") {
      triggerConfetti(3000);
      toast.success(strings.toasts.otpVerified);
    }
    
    if (data) {
      const wasCompleted = previousStatus === "Completed";
      const isNowCompleted = data.status === "Completed";
      setPreviousStatus(data.status);
      
      // Check if order has a reported issue
      if (isNowCompleted) {
        hasOrderIssue(data.id).then(issueExists => {
          setHasIssue(issueExists);
        });
      }
      
      // Show completion modal if order is completed and hasn't been rated and no issue reported
      // Only show if transitioning to completed or if already completed on initial load
      if (isNowCompleted && !data.runner_rating) {
        // Check if issue was reported before showing modal
        hasOrderIssue(data.id).then(issueExists => {
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
    }
    
    setOrder(data);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  // Handle realtime updates for this specific order
  const handleOrderUpdate = useCallback((updatedOrder: Order, oldOrder?: Order) => {
    if (!orderId || !updatedOrder) return;
    
    console.log('[OrderTracking] Realtime update received:', {
      orderId: updatedOrder.id,
      oldStatus: oldOrder?.status,
      newStatus: updatedOrder.status,
    });
    
    // Update state immediately with payload data for instant UI update
    setOrder((prev) => {
      if (!prev || prev.id !== updatedOrder.id) return prev;
      
      // Merge the update into existing order to preserve relations
      return {
        ...prev,
        ...updatedOrder,
      } as OrderWithDetails;
    });
    
    // Check for status transitions
    if (previousStatus && previousStatus !== "Completed" && updatedOrder.status === "Completed") {
      triggerConfetti(3000);
      toast.success(strings.toasts.otpVerified);
      // Show completion modal if order hasn't been rated yet
      // We'll check this after fetching full order details
    }
    
    // Update previous status
    if (updatedOrder.status) {
      setPreviousStatus(updatedOrder.status);
    }
    
    // Fetch full order details in background to get relations and trigger status re-check
    // This ensures ActiveDeliverySheet can detect runner arrival
    getOrderById(orderId).then((data) => {
      if (data && data.id === orderId) {
        setOrder(data);
        // Show completion modal if order just completed and hasn't been rated
        if (previousStatus && previousStatus !== "Completed" && data.status === "Completed" && !data.runner_rating) {
          // Small delay to let confetti animation play first
          setTimeout(() => {
            setShowCompletionModal(true);
          }, 1000);
        }
      }
    }).catch((error) => {
      console.error('[OrderTracking] Error fetching full order details:', error);
      // Don't show error to user, we already updated with payload data
    });
  }, [orderId, previousStatus]);

  // Subscribe to realtime updates for this order
  useOrderRealtime(orderId, {
    onUpdate: handleOrderUpdate,
  });

  // Debug logging for PWA
  useEffect(() => {
    if (orderId) {
      console.log('[OrderTracking] Realtime subscription mounted', {
        orderId,
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
  }, [orderId]);

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
        // Update order status immediately for instant UI feedback
        setOrder((prev) => prev ? { ...prev, status: 'Cancelled' as OrderStatus } : null);
        // Navigate back to home after a short delay
        setTimeout(() => {
          navigate("/customer/home");
        }, 1500);
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
    // Scroll to messages in expanded sheet or expand sheet
    setSheetExpanded(true);
    // Focus will be handled by chat component
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
  const getMapLocations = () => {
    if (!showLiveMap) return null;
    
    const dummyLocations = getDummyLocations();
    // Customer map only shows route from ATM to customer (after cash withdrawal)
    // This should match runner's map when status is Cash Withdrawn / Pending Handoff / Completed
    const showCustomerRoute = ['Cash Withdrawn', 'Pending Handoff', 'Completed'].includes(order.status);
    
    if (showCustomerRoute) {
      // After cash withdrawal: show route from ATM to customer
      // Use EXACT same logic and locations as runner map for consistency
      const customerLocation = {
        // Use dummy customer location for consistency with runner map (which uses dummyLocations.customer)
        // Fallback to order address if available, but prefer dummy for testing consistency
        lat: dummyLocations.customer.lat, // Use dummy first to match runner
        lng: dummyLocations.customer.lng,
        address: order.customer_address || 'Customer Address',
      };
      
      // Use EXACT same locations as runner map
      return {
        origin: dummyLocations.atm, // ATM location (exactly same as runner)
        destination: customerLocation,
        title: 'Route to You',
      };
    }
    
    return null;
  };

  const mapLocations = getMapLocations();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F5F5F7]">
      {/* Back Button - Fixed Top Left - Circular */}
      {/* Standardized spacing: px-6 (24px) for consistent alignment */}
      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={() => navigate("/customer/home")}
          className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white/95 backdrop-blur hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Map Background - Half Screen (Top to Middle) */}
      <div className="absolute inset-x-0 top-0 h-1/2 z-0 pointer-events-none">
        {mapLocations ? (
          <RunnerDirectionsMap
            origin={mapLocations.origin}
            destination={mapLocations.destination}
            title={mapLocations.title}
            height="100%"
            className="pointer-events-none"
            bottomPadding={mapBottomPadding}
            interactive={true}
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
          />
        )}
      </div>

      {/* Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 z-10 pointer-events-none" />

      {/* Completion Rating Modal - Only show if no issue was reported */}
      {!hasIssue && (
        <CompletionRatingModal
          order={order}
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onRated={() => {
            // Refresh order to get updated rating
            if (orderId) {
              getOrderById(orderId).then((data) => {
                if (data) setOrder(data);
              });
            }
          }}
        />
      )}

      {/* Bottom Sheet */}
      <ActiveDeliverySheet
        order={order}
        isExpanded={sheetExpanded}
        onToggleExpand={() => setSheetExpanded(v => !v)}
        onCancel={handleCancel}
        onReorder={handleReorder}
        onMessage={handleMessage}
        onCallSupport={handleCallSupport}
        onOrderUpdate={(updatedOrder) => setOrder(updatedOrder)}
        onCollapsedHeightChange={setMapBottomPadding}
      />
    </div>
  );
}
