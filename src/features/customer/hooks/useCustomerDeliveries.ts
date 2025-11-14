/**
 * useCustomerDeliveries Hook
 * 
 * Fetches and transforms customer orders into CustomerDelivery format
 * for the deliveries history feature
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerOrders } from "@/db/api";
import { isTerminalStatus } from "@/lib/orderStatus";
import type { OrderWithDetails } from "@/types/types";
import type { CustomerDelivery, DeliveryStatus } from "@/types/delivery";

/**
 * Transform OrderWithDetails to CustomerDelivery
 */
function transformOrderToDelivery(order: OrderWithDetails): CustomerDelivery {
  // Determine status
  let status: DeliveryStatus = "incomplete";
  if (order.status === "Completed") {
    status = "delivered";
  } else if (order.status === "Cancelled" || order.cancelled_at) {
    status = "cancelled";
  }

  // Get address label
  let locationLabel = "Address";
  let addressLine1 = "";
  
  if (order.address_snapshot?.label) {
    locationLabel = order.address_snapshot.label;
  } else if (order.address_snapshot?.line1) {
    const parts = order.address_snapshot.line1.split(',');
    locationLabel = parts[0] || "Address";
    addressLine1 = order.address_snapshot.line1;
  } else if (order.customer_address) {
    const parts = order.customer_address.split(',');
    locationLabel = parts[0] || "Address";
    addressLine1 = order.customer_address;
  }

  // Runner summary
  const runner: CustomerDelivery["runner"] = order.runner
    ? {
        id: order.runner.id,
        displayName: order.runner.first_name || order.runner.full_name || "Runner",
        avatarUrl: order.runner.avatar_url || null,
        averageRating: null, // TODO: fetch from runner stats if available
      }
    : null;

  return {
    id: order.id,
    customerId: order.customer_id,
    runner,
    amountDelivered: order.requested_amount,
    totalPaid: order.total_payment,
    locationLabel,
    addressLine1,
    createdAt: order.created_at,
    deliveredAt: order.handoff_completed_at || null,
    status,
    customerRating: order.runner_rating || null,
    customerReview: order.runner_rating_comment || null,
    serviceFee: order.total_service_fee,
    profit: order.profit,
    complianceFee: order.compliance_fee,
    deliveryFee: order.delivery_fee,
    runnerAcceptedAt: order.runner_accepted_at || null,
    runnerAtAtmAt: order.runner_at_atm_at || null,
    cashWithdrawnAt: order.cash_withdrawn_at || null,
    cancelledAt: order.cancelled_at || null,
    cancellationReason: order.cancellation_reason || null,
  };
}

export function useCustomerDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<CustomerDelivery[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");

  const loadDeliveries = useCallback(async () => {
    if (!user) {
      setStatus("idle");
      setDeliveries([]);
      return;
    }

    setStatus("loading");
    try {
      const orders = await getCustomerOrders();
      
      // Only keep orders whose status is terminal (Completed or Cancelled)
      const terminalOrders = orders.filter(order => isTerminalStatus(order.status));
      
      // Transform only terminal orders to deliveries
      const transformed = terminalOrders.map(transformOrderToDelivery);
      
      // Sort by most recent first (deliveredAt or createdAt)
      transformed.sort((a, b) => {
        const dateA = a.deliveredAt 
          ? new Date(a.deliveredAt).getTime() 
          : new Date(a.createdAt).getTime();
        const dateB = b.deliveredAt 
          ? new Date(b.deliveredAt).getTime() 
          : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setDeliveries(transformed);
      setStatus("success");
    } catch (error) {
      console.error("[useCustomerDeliveries] error loading deliveries", error);
      setStatus("error");
      setDeliveries([]);
    }
  }, [user]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const refetch = useCallback(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  return {
    deliveries,
    isLoading: status === "loading",
    isError: status === "error",
    refetch,
  };
}

