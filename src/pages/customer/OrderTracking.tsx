import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrderById, cancelOrder } from "@/db/api";
import { useOrderRealtime } from "@/hooks/useOrdersRealtime";
import type { OrderWithDetails, OrderStatus, Order } from "@/types/types";
import { CustomerOrderMap } from "@/components/order/CustomerOrderMap";
import { triggerConfetti } from "@/lib/confetti";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { ActiveDeliverySheet } from "@/components/customer/ActiveDeliverySheet";
import { canShowLiveLocation } from "@/lib/reveal";

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<OrderStatus | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    
    // Trigger confetti on completion
    if (data && previousStatus && previousStatus !== "Completed" && data.status === "Completed") {
      triggerConfetti(3000);
      toast.success(strings.toasts.otpVerified);
    }
    
    if (data) {
      setPreviousStatus(data.status);
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F5F5F7]">
      {/* Back Button - Fixed Top Left */}
      <div className="absolute top-4 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/customer/home")}
          className="bg-white/95 backdrop-blur shadow-lg border-black/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Map Background - Full Screen */}
      <div className="absolute inset-0 z-0 pointer-events-none">
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
      </div>

      {/* Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 z-10 pointer-events-none" />

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
      />
    </div>
  );
}
