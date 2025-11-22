import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Package, CheckCircle2, MapPin, Clock, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShellCard } from "@/components/ui/ShellCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { toast } from "sonner";
import { getRunnerOrders, acceptOrder, getAvailableOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useProfile } from "@/contexts/ProfileContext";
import { getRunnerPayout, calculateTotalEarnings } from "@/lib/payouts";
import type { OrderWithDetails, Order } from "@/types/types";
import { NewJobAlert } from "@/components/runner/NewJobAlert";

interface EarningsStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export default function RunnerHome() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
  const [availableOrders, setAvailableOrders] = useState<OrderWithDetails[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<OrderWithDetails[]>([]);
  const [earnings, setEarnings] = useState<EarningsStats>({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [newJobAlert, setNewJobAlert] = useState<OrderWithDetails | null>(null);

  const isOnline = profile?.is_online ?? false;

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load runner's orders
      const runnerOrders = await getRunnerOrders();
      
      // Find active order (non-completed, non-cancelled)
      const finalStatuses = ['Completed', 'Cancelled'];
      const active = runnerOrders.find(o => !finalStatuses.includes(o.status)) || null;
      setActiveOrder(active);

      // Get recent completed deliveries (last 5)
      const completed = runnerOrders
        .filter(o => o.status === 'Completed')
        .sort((a, b) => {
          const dateA = a.handoff_completed_at ? new Date(a.handoff_completed_at) : new Date(a.updated_at);
          const dateB = b.handoff_completed_at ? new Date(b.handoff_completed_at) : new Date(b.updated_at);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      setRecentDeliveries(completed);

      // Calculate earnings
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

      const todayEarnings = completed
        .filter(o => {
          const completedDate = o.handoff_completed_at ? new Date(o.handoff_completed_at) : new Date(o.updated_at);
          return completedDate >= today;
        })
        .reduce((sum, o) => sum + getRunnerPayout(o), 0);

      const weekEarnings = completed
        .filter(o => {
          const completedDate = o.handoff_completed_at ? new Date(o.handoff_completed_at) : new Date(o.updated_at);
          return completedDate >= weekStart;
        })
        .reduce((sum, o) => sum + getRunnerPayout(o), 0);

      const monthEarnings = completed
        .filter(o => {
          const completedDate = o.handoff_completed_at ? new Date(o.handoff_completed_at) : new Date(o.updated_at);
          return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + getRunnerPayout(o), 0);

      setEarnings({ today: todayEarnings, thisWeek: weekEarnings, thisMonth: monthEarnings });

      // Load available orders if online
      if (isOnline) {
        const available = await getAvailableOrders();
        setAvailableOrders(available);
      }
    } catch (error) {
      console.error("Error loading runner data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle realtime updates for active order
  const handleActiveOrderUpdate = useCallback((order: Order) => {
    const finalStatuses = ['Completed', 'Cancelled'];
    if (finalStatuses.includes(order.status)) {
      // Order completed or cancelled, reload data
      loadData();
    } else {
      setActiveOrder(order as OrderWithDetails);
    }
  }, [loadData]);

  // Subscribe to runner's active orders
  useOrdersRealtime({
    filter: { mode: 'runner', runnerId: profile?.id },
    onUpdate: handleActiveOrderUpdate,
    enabled: !!profile?.id,
  });

  // Handle new available orders (for interruptive alert)
  const handleNewAvailableOrder = useCallback((order: Order) => {
    console.log('[RunnerHome] 🎉 New available order callback triggered:', {
      orderId: order.id,
      status: order.status,
      runnerId: order.runner_id,
      isOnline,
      requestedAmount: order.requested_amount,
      customerAddress: order.customer_address,
      timestamp: new Date().toISOString(),
    });

    // Only process if order is truly available (Pending, no runner, and we're online)
    if (order.status === 'Pending' && (order.runner_id === null || order.runner_id === undefined) && isOnline) {
      console.log('[RunnerHome] ✅ Order is available - Adding to list and showing alert');
      
      // Show interruptive alert
      setNewJobAlert(order as OrderWithDetails);
      console.log('[RunnerHome] ✅ New job alert displayed');
      
      // Also add to available orders list
      setAvailableOrders((prev) => {
        // Check if order already exists
        if (prev.some((o) => o.id === order.id)) {
          console.log('[RunnerHome] ⚠️ Order already in available list, skipping duplicate');
          return prev;
        }
        console.log('[RunnerHome] ✅ Adding order to available list. Previous count:', prev.length);
        const updated = [order as OrderWithDetails, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        console.log('[RunnerHome] ✅ Updated available orders count:', updated.length);
        return updated;
      });
    } else {
      console.log('[RunnerHome] ⚠️ Filtered out order (not available or offline):', {
        status: order.status,
        statusMatch: order.status === 'Pending',
        runnerId: order.runner_id,
        runnerIdIsNull: order.runner_id === null || order.runner_id === undefined,
        isOnline,
      });
    }
  }, [isOnline]);

  // Handle available order updates (removed when accepted)
  const handleAvailableOrderUpdate = useCallback((order: Order, oldOrder?: Order) => {
    console.log('[RunnerHome] Available order update received:', {
      orderId: order.id,
      oldStatus: oldOrder?.status,
      newStatus: order.status,
      oldRunnerId: oldOrder?.runner_id,
      newRunnerId: order.runner_id,
    });

    // If order was accepted by someone (status changed or runner_id set), remove from available
    if (order.status !== 'Pending' || order.runner_id !== null) {
      console.log('[RunnerHome] Order no longer available, removing from list');
      
      // Remove from available orders list
      setAvailableOrders((prev) => {
        const filtered = prev.filter((o) => o.id !== order.id);
        console.log('[RunnerHome] Removed order from available list. Remaining:', filtered.length);
        return filtered;
      });
      
      // Also dismiss alert if it's the same order
      setNewJobAlert((prev) => {
        if (prev?.id === order.id) {
          console.log('[RunnerHome] Dismissing alert for accepted order');
          return null;
        }
        return prev;
      });

      // If we accepted this order, reload data to get active order
      if (order.runner_id === profile?.id) {
        console.log('[RunnerHome] We accepted this order, reloading data');
        loadData();
      }
    } else {
      // Update existing order in the list
      console.log('[RunnerHome] Updating order in available list');
      setAvailableOrders((prev) =>
        prev.map((o) => (o.id === order.id ? (order as OrderWithDetails) : o))
      );
    }
  }, [profile?.id, loadData]);

  // Subscribe to available orders (only when online)
  useOrdersRealtime({
    filter: { mode: 'runner', availableOnly: true },
    onInsert: handleNewAvailableOrder,
    onUpdate: handleAvailableOrderUpdate,
    enabled: isOnline,
  });

  // Log subscription status
  useEffect(() => {
    if (isOnline) {
      console.log('[RunnerHome] 📡 Realtime subscription enabled - Listening for new orders');
      console.log('[RunnerHome] 💡 When a customer creates an order, it should appear here immediately');
    } else {
      console.log('[RunnerHome] ⏸️ Realtime subscription disabled - Runner is offline');
    }
  }, [isOnline]);

  // Handle accepting an order
  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      console.log('[RunnerHome] Accepting order:', orderId);
      const result = await acceptOrder(orderId);
      
      if (result.success) {
        console.log('[RunnerHome] Order accepted successfully');
        toast.success("Order accepted! Proceed to delivery");
        
        // Dismiss alert
        setNewJobAlert(null);
        
        // Remove from available orders list immediately (optimistic update)
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        
        // Reload data to get the active order
        await loadData();
        
        // Navigate to order detail
        navigate(`/runner/orders/${orderId}`);
      } else {
        const errorMessage = result.error || "Failed to accept order. It may have been taken by another runner.";
        console.error('[RunnerHome] Order acceptance failed:', errorMessage);
        toast.error(errorMessage);
        
        // Reload available orders to refresh the list
        if (isOnline) {
          const available = await getAvailableOrders();
          setAvailableOrders(available);
        }
      }
    } catch (error: any) {
      console.error("Error accepting order:", error);
      toast.error(error?.message || "Failed to accept order");
      
      // Reload available orders on error
      if (isOnline) {
        try {
          const available = await getAvailableOrders();
          setAvailableOrders(available);
        } catch (reloadError) {
          console.error("Error reloading available orders:", reloadError);
        }
      }
    } finally {
      setAccepting(null);
    }
  };

  const handleDismissAlert = () => {
    setNewJobAlert(null);
  };

  const handleViewDetails = (orderId: string) => {
    setNewJobAlert(null);
    // Scroll to the order in the list or navigate
    const element = document.getElementById(`order-${orderId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-slate-400">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Job Alert Banner */}
      {newJobAlert && (
        <NewJobAlert
          order={newJobAlert}
          onAccept={() => handleAccept(newJobAlert.id)}
          onDismiss={handleDismissAlert}
          onViewDetails={() => handleViewDetails(newJobAlert.id)}
          accepting={accepting === newJobAlert.id}
        />
      )}

      {/* Earnings Overview */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Earnings Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ShellCard variant="runner" className="bg-[#050816] border-indigo-500/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span>Today</span>
              </div>
              <div className="text-3xl font-bold text-white">
                ${earnings.today.toFixed(2)}
              </div>
            </div>
          </ShellCard>
          <ShellCard variant="runner" className="bg-[#050816] border-indigo-500/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span>This Week</span>
              </div>
              <div className="text-3xl font-bold text-white">
                ${earnings.thisWeek.toFixed(2)}
              </div>
            </div>
          </ShellCard>
          <ShellCard variant="runner" className="bg-[#050816] border-indigo-500/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span>This Month</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">
                ${earnings.thisMonth.toFixed(2)}
              </div>
            </div>
          </ShellCard>
        </div>
      </div>

      {/* Active Delivery */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Active Delivery</h2>
        {activeOrder ? (
          <ShellCard variant="runner" className="hover:border-indigo-500/30 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    ${activeOrder.requested_amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-emerald-400 font-medium mt-1">
                    Earn ${getRunnerPayout(activeOrder).toFixed(2)}
                  </div>
                </div>
                <StatusChip status={activeOrder.status} />
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">{activeOrder.customer_address}</span>
                </div>
                {activeOrder.customer_notes && (
                  <div className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                    <strong className="text-slate-300">Note:</strong> {activeOrder.customer_notes}
                  </div>
                )}
              </div>

              <Button
                onClick={() => navigate(`/runner/orders/${activeOrder.id}`)}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Delivery / Update Status
              </Button>
            </div>
          </ShellCard>
        ) : (
          <ShellCard variant="runner">
            <div className="py-8 text-center">
              <Package className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 mb-2">No active delivery yet</p>
              <p className="text-sm text-slate-500">New jobs will appear here when you're online</p>
            </div>
          </ShellCard>
        )}
      </div>

      {/* New Job Offers */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">New Delivery Offers</h2>
        {!isOnline ? (
          <ShellCard variant="runner">
            <div className="py-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-slate-800 p-3">
                  <Package className="h-8 w-8 text-slate-500" />
                </div>
              </div>
              <p className="text-slate-300 mb-2">You're offline</p>
              <p className="text-sm text-slate-500">
                Go online to receive new delivery offers
              </p>
            </div>
          </ShellCard>
        ) : availableOrders.length === 0 ? (
          <ShellCard variant="runner">
            <div className="py-8 text-center">
              <p className="text-slate-300 mb-2">No offers at the moment</p>
              <p className="text-sm text-slate-500">
                We'll pop new opportunities here when you're online
              </p>
            </div>
          </ShellCard>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => (
              <ShellCard
                key={order.id}
                id={`order-${order.id}`}
                variant="runner"
                className="hover:border-indigo-500/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-bold text-white">
                        ${order.requested_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-emerald-400 font-medium">
                        Earn ${getRunnerPayout(order).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 line-clamp-2">{order.customer_address}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
                      }}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={() => handleAccept(order.id)}
                      disabled={accepting === order.id}
                      className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      {accepting === order.id ? "Accepting..." : "Accept"}
                    </Button>
                  </div>
                </div>
              </ShellCard>
            ))}
          </div>
        )}
      </div>

      {/* Delivery History Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Deliveries</h2>
          <Button
            onClick={() => navigate("/runner/orders")}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        {recentDeliveries.length === 0 ? (
          <ShellCard variant="runner">
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 mb-2">No completed deliveries yet</p>
              <p className="text-sm text-slate-500">Your delivery history will appear here</p>
            </div>
          </ShellCard>
        ) : (
          <div className="space-y-2">
            {recentDeliveries.map((order) => (
              <ShellCard key={order.id} variant="runner" className="hover:border-indigo-500/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-white">
                        ${order.requested_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-emerald-400">
                        +${getRunnerPayout(order).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {order.handoff_completed_at
                        ? new Date(order.handoff_completed_at).toLocaleDateString('en-US')
                        : new Date(order.updated_at).toLocaleDateString('en-US')}
                    </div>
                  </div>
                  <StatusChip status={order.status} />
                </div>
              </ShellCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

