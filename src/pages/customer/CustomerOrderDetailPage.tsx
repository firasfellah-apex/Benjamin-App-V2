import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrderById } from "@/db/api";
import { isTerminalStatus } from "@/lib/orderStatus";
import type { OrderWithDetails, Order } from "@/types/types";
import CustomerDeliveryDetail from "./CustomerDeliveryDetail";
import OrderTracking from "./OrderTracking";
import { useOrderRealtime } from "@/hooks/useOrdersRealtime";

/**
 * CustomerOrderDetailPage
 * 
 * Unified route handler for order details.
 * - If order is terminal (Completed or Cancelled) → shows CustomerDeliveryDetail (history view)
 * - Otherwise → shows live tracking (OrderTracking)
 * 
 * When an order TRANSITIONS to Completed during active tracking, navigate to home.
 * But if viewing a past completed order from history, show the detail view.
 */
export default function CustomerOrderDetailPage() {
  // Route uses :deliveryId but it's actually an order ID
  const { deliveryId: orderId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if order was already completed when we first loaded it
  // This distinguishes "viewing history" from "order just completed during tracking"
  const wasAlreadyCompletedRef = useRef<boolean | null>(null);
  const hasNavigatedToHomeRef = useRef(false);

  // Load order
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
        
        // Remember if order was already completed on first load
        // If true, user is viewing history. If false, user is tracking active order.
        if (wasAlreadyCompletedRef.current === null) {
          wasAlreadyCompletedRef.current = data?.status === 'Completed';
        }
      } catch (error) {
        console.error("Error loading order:", error);
        navigate("/customer/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, navigate]);

  // Handle realtime updates
  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    if (!orderId || !updatedOrder || updatedOrder.id !== orderId) return;
    
    // If order just completed (was NOT already completed when we loaded),
    // navigate to home - this means user was tracking and it completed
    if (
      updatedOrder.status === 'Completed' && 
      wasAlreadyCompletedRef.current === false && 
      !hasNavigatedToHomeRef.current
    ) {
      hasNavigatedToHomeRef.current = true;
      navigate('/customer/home', { replace: true });
      return;
    }
    
    // Update order state
    setOrder((prev) => {
      if (!prev || prev.id !== updatedOrder.id) return prev;
      return {
        ...prev,
        ...updatedOrder,
      } as OrderWithDetails;
    });
    
    // If order becomes terminal, fetch full details to get relations
    if (isTerminalStatus(updatedOrder.status)) {
      getOrderById(orderId)
        .then((data) => {
          if (data) setOrder(data);
        })
        .catch((error) => {
          console.error("Error fetching terminal order details:", error);
        });
    }
  }, [orderId, navigate]);

  // Subscribe to realtime updates
  useOrderRealtime(loading ? null : orderId || null, {
    onUpdate: handleOrderUpdate,
  });

  // Determine if order is terminal (Completed or Cancelled)
  const isTerminal = order ? isTerminalStatus(order.status) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-400">Loading order...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-400 mb-4">Order not found</div>
          <button
            onClick={() => navigate("/customer/orders")}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Back to orders
          </button>
        </div>
      </div>
    );
  }

  if (isTerminal) {
    // Terminal order (Completed or Cancelled) → history detail view
    // CustomerDeliveryDetail expects deliveryId param and will find it from useCustomerDeliveries
    return <CustomerDeliveryDetail />;
  }

  // Active order → live tracking flow
  return <OrderTracking orderId={order.id} />;
}

