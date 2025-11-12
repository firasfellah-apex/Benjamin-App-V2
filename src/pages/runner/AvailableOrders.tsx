import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, MapPin, Clock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShellCard } from "@/components/ui/ShellCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { toast } from "sonner";
import { getAvailableOrders, acceptOrder } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useProfile } from "@/contexts/ProfileContext";
import type { OrderWithDetails, Order } from "@/types/types";

export default function AvailableOrders() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const isOnline = profile?.is_online ?? false;

  const loadOrders = async () => {
    // Only load orders if runner is online
    if (!isOnline) {
      setLoading(false);
      return;
    }
    
    const data = await getAvailableOrders();
    setOrders(data);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [isOnline]);

  // Handle realtime updates for available orders (status = Pending, runner_id IS NULL)
  const handleOrderInsert = useCallback((order: Order) => {
    console.log('[AvailableOrders] Realtime INSERT received:', {
      orderId: order.id,
      status: order.status,
      runnerId: order.runner_id,
      isPending: order.status === 'Pending',
      hasNoRunner: !order.runner_id,
    });
    
    // Only add if it's a pending order with no runner
    if (order.status === 'Pending' && !order.runner_id) {
      console.log('[AvailableOrders] Order is available, adding to list');
      setOrders((prev) => {
        // Check if order already exists
        if (prev.some((o) => o.id === order.id)) {
          console.log('[AvailableOrders] Order already exists, skipping insert');
          return prev;
        }
        // Add to the beginning and sort by created_at
        const updated = [order as OrderWithDetails, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        console.log('[AvailableOrders] Order added, new count:', updated.length);
        return updated;
      });
    } else {
      console.log('[AvailableOrders] Order filtered out (not available):', {
        status: order.status,
        runnerId: order.runner_id,
      });
    }
  }, []);

  const handleOrderUpdate = useCallback((order: Order) => {
    setOrders((prev) => {
      // If order is no longer available (accepted or status changed), remove it
      if (order.status !== 'Pending' || order.runner_id !== null) {
        return prev.filter((o) => o.id !== order.id);
      }
      // Otherwise update the existing order
      return prev.map((o) => (o.id === order.id ? (order as OrderWithDetails) : o));
    });
  }, []);

  const handleOrderDelete = useCallback((order: Order) => {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
  }, []);

  // Subscribe to available orders (Pending status, runner_id IS NULL)
  // Only subscribe if runner is online
  useOrdersRealtime({
    filter: { mode: 'runner', availableOnly: true },
    onInsert: handleOrderInsert,
    onUpdate: handleOrderUpdate,
    onDelete: handleOrderDelete,
    enabled: isOnline,
  });

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      const result = await acceptOrder(orderId);
      if (result.success) {
        toast.success("Order accepted! Proceed to ATM");
        navigate(`/runner/orders/${orderId}`);
      } else {
        const errorMessage = result.error || "Failed to accept order. It may have been taken by another runner.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error accepting order:", error);
      toast.error(error?.message || "Failed to accept order");
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Available Orders</h1>
        <p className="text-sm text-slate-400">
          Accept orders and start earning
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">
          Loading available orders...
        </div>
      ) : !isOnline ? (
        <ShellCard variant="runner">
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Radio className="h-8 w-8 text-slate-500" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-white mb-2">You're currently offline</p>
              <p className="text-sm text-slate-400 mb-4">
                Go online to see available deliveries and start earning
              </p>
              <p className="text-xs text-slate-500">
                Use the toggle in the header to go online
              </p>
            </div>
          </div>
        </ShellCard>
      ) : orders.length === 0 ? (
        <ShellCard variant="runner">
          <div className="py-12 text-center">
            <p className="text-slate-300 mb-2">No orders available at the moment</p>
            <p className="text-sm text-slate-500">Check back soon for new delivery requests</p>
          </div>
        </ShellCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <ShellCard key={order.id} variant="runner" className="hover:border-indigo-500/30 transition-all">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      ${order.requested_amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-emerald-400 font-medium">
                      Earn ${order.delivery_fee.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 line-clamp-2">
                      {order.customer_address}
                    </span>
                  </div>
                  {order.customer_notes && (
                    <div className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                      <strong className="text-slate-300">Note:</strong> {order.customer_notes}
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cash Amount</span>
                    <span className="font-semibold text-white">${order.requested_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Your Earnings</span>
                    <span className="font-semibold text-emerald-400">${order.delivery_fee.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleAccept(order.id)}
                  disabled={accepting === order.id}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {accepting === order.id ? "Accepting..." : "Accept Order"}
                </Button>
              </div>
            </ShellCard>
          ))}
        </div>
      )}
    </div>
  );
}
