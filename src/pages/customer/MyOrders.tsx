import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "@/lib/icons";
import { CustomerButton } from "@/pages/customer/components/CustomerButton";
import { getCustomerOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderWithDetails, Order } from "@/types/types";
import { OrderListSkeleton } from "@/components/order/OrderListSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { strings } from "@/lib/strings";
import { OrderCard } from "@/components/customer/OrderCard";

interface GroupedOrders {
  [key: string]: OrderWithDetails[];
}

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const data = await getCustomerOrders();
    // Sort by created_at descending (most recent first)
    const sorted = data.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setOrders(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle realtime order updates
  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    console.log('[MyOrders] Order update received:', updatedOrder.id, updatedOrder.status);
    
    // Update the order in the list
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
      
      if (existingIndex >= 0) {
        // Update existing order and re-sort
        const updated = prev.map((o) => 
          o.id === updatedOrder.id 
            ? { ...o, ...updatedOrder } as OrderWithDetails
            : o
        );
        return updated.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        // New order, reload to get full details
        loadOrders();
        return prev;
      }
    });
  }, [loadOrders]);

  // Subscribe to realtime updates for customer orders
  useOrdersRealtime({
    filter: { mode: 'customer', customerId: user?.id || '' },
    onUpdate: handleOrderUpdate,
    onInsert: handleOrderUpdate,
    enabled: !!user?.id,
  });

  // Group orders by month
  const groupedOrders = useMemo<GroupedOrders>(() => {
    const groups: GroupedOrders = {};
    
    orders.forEach((order) => {
      const date = new Date(order.created_at);
      const monthKey = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(order);
    });
    
    return groups;
  }, [orders]);

  // Get sorted month keys (most recent first)
  const monthKeys = useMemo(() => {
    return Object.keys(groupedOrders).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedOrders]);

  const handleReorder = (order: OrderWithDetails) => {
    // Navigate to request page with prefilled data
    const params = new URLSearchParams();
    
    // Prefill amount
    params.set('amount', order.requested_amount.toString());
    
    // Store address info for prefilling (if address_id exists, use it; otherwise use snapshot)
    if (order.address_id) {
      params.set('address_id', order.address_id);
    } else if (order.address_snapshot) {
      // Store address snapshot in sessionStorage for address selector to use
      sessionStorage.setItem('reorder_address_snapshot', JSON.stringify(order.address_snapshot));
    }
    
    navigate(`/customer/request?${params.toString()}`);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            {strings.customer.ordersTitle}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {strings.customer.ordersSubtitle}
          </p>
        </div>
        <CustomerButton 
          onClick={() => navigate("/customer/request")}
        >
          Request Cash
        </CustomerButton>
      </div>

      {loading ? (
        <div className="space-y-4">
          <OrderListSkeleton count={3} />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={strings.emptyStates.noOrders}
          description="Your past deliveries appear here. Each one tells its story."
          actionLabel="Request Cash Now"
          onAction={() => navigate("/customer/request")}
        />
      ) : (
        <div className="space-y-8">
          {monthKeys.map((monthKey) => (
            <div key={monthKey} className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 px-1">
                {monthKey}
              </h2>
              <div className="space-y-3">
                {groupedOrders[monthKey].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onReorder={handleReorder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
