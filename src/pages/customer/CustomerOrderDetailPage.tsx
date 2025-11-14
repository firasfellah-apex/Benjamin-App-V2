import { useEffect, useState, useCallback } from "react";
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
 * - If order is completed → shows CompletedOrderDetail
 * - Otherwise → shows live tracking (OrderTracking)
 * 
 * Handles realtime updates and switches to completed view when order becomes completed.
 */
export default function CustomerOrderDetailPage() {
  // Route uses :deliveryId but it's actually an order ID
  const { deliveryId: orderId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Load order
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
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
    
    // Update order state
    setOrder((prev) => {
      if (!prev || prev.id !== updatedOrder.id) return prev;
      return {
        ...prev,
        ...updatedOrder,
      } as OrderWithDetails;
    });
    
    // If order becomes terminal (Completed or Cancelled), fetch full details to get relations
    if (isTerminalStatus(updatedOrder.status)) {
      getOrderById(orderId)
        .then((data) => {
          if (data) setOrder(data);
        })
        .catch((error) => {
          console.error("Error fetching terminal order details:", error);
        });
    }
  }, [orderId]);

  // Subscribe to realtime updates
  useOrderRealtime(loading ? null : orderId || null, {
    onUpdate: handleOrderUpdate,
  });

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

  // Determine if order is terminal (Completed or Cancelled)
  const terminal = isTerminalStatus(order.status);

  if (terminal) {
    // Terminal order → history detail view (top shelf)
    // CustomerDeliveryDetail expects deliveryId param and will find it from useCustomerDeliveries
    // Since we filtered deliveries to only terminal orders, it will find this one
    return <CustomerDeliveryDetail />;
  }

  // Active order → live tracking flow (bottom sheet, OTP, real-time updates)
  return <OrderTracking orderId={order.id} />;
}

