import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ArrowRight, Eye, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShellCard } from "@/components/ui/ShellCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { toast } from "sonner";
import { getRunnerOrders, getRunnerOrderHistory } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useProfile } from "@/contexts/ProfileContext";
import { getRunnerPayout } from "@/lib/payouts";
import type { OrderWithDetails, Order } from "@/types/types";
import { updateRunnerOnlineStatus } from "@/db/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { canSeeCashAmount, getCustomerPublicProfile, getCustomerAddressDisplay, canConfirmAtATM, getCashAmountRevealMessage, canShowCashAmountToRunner } from "@/lib/revealRunnerView";
import { Avatar } from "@/components/common/Avatar";
import { RUNNER_TERMINAL_STATUSES } from "@/lib/orderStatus";
import { useRunnerJobs } from "@/features/runner/state/runnerJobsStore";
import {
  OnlineCardSkeleton,
  AvailableRequestSkeleton,
  RunnerSkeleton,
} from "@/components/runner/RunnerSkeleton";

export default function Work() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile } = useProfile();
  const { pendingOffer, setOnline: setStoreOnline } = useRunnerJobs();
  const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
  const [orderHistory, setOrderHistory] = useState<Array<OrderWithDetails & { historyStatus: 'Completed' | 'Skipped' | 'Timed-Out' }>>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOnlineStatus, setUpdatingOnlineStatus] = useState(false);

  const isOnline = profile?.is_online ?? false;

  // Check if runner has an active job (non-terminal order)
  const hasActiveJob = useMemo(() => {
    return !!activeOrder && !RUNNER_TERMINAL_STATUSES.includes(activeOrder.status);
  }, [activeOrder]);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load runner's orders
      const runnerOrders = await getRunnerOrders();
      
      // Find active order (non-completed, non-cancelled)
      const active = runnerOrders.find(o => !RUNNER_TERMINAL_STATUSES.includes(o.status)) || null;
      setActiveOrder(active);

      // Get order history (Completed, Skipped, Timed-Out)
      const history = await getRunnerOrderHistory();
      setOrderHistory(history.slice(0, 5)); // Show last 5 orders

      // Available orders are now handled by the global modal system
      // No need to load them here
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

  // Handle scroll to online card when navigating from header pill
  useEffect(() => {
    // Check if we navigated here with scroll intent
    const state = location.state as { scrollToOnlineCard?: boolean } | null;
    if (state?.scrollToOnlineCard) {
      // Wait for content to load, then scroll
      const timer = setTimeout(() => {
        const onlineCard = document.getElementById("runner-online-card");
        if (onlineCard) {
          onlineCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // Clear the state to prevent re-scrolling
        window.history.replaceState({}, "", location.pathname);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [location.state, location.pathname]);

  // Handle online/offline toggle
  const handleOnlineToggle = async (checked: boolean) => {
    // Client-side guard: Prevent going offline if runner has active job
    if (!checked && hasActiveJob) {
      toast.error("You're on an active delivery. Finish it before going offline.");
      return;
    }

    setUpdatingOnlineStatus(true);
    try {
      const result = await updateRunnerOnlineStatus(checked);
      if (result.success) {
        await refreshProfile();
        // Sync to store
        setStoreOnline(checked);
        toast.success(checked ? "You're now online" : "You're now offline");
        // Reload available orders if going online
        if (checked) {
          const available = await getAvailableOrders();
          setAvailableOrders(available);
        } else {
          setAvailableOrders([]);
        }
      } else {
        await refreshProfile();
        // Server-side validation will provide the error message
        toast.error(result.error || "Failed to update status");
      }
    } catch (error: any) {
      await refreshProfile();
      console.error("Error updating online status:", error);
      toast.error(error?.message || "Failed to update status");
    } finally {
      setUpdatingOnlineStatus(false);
    }
  };

  // Handle realtime updates for active order
  const handleActiveOrderUpdate = useCallback((order: Order) => {
    if (RUNNER_TERMINAL_STATUSES.includes(order.status)) {
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

  // Available orders are now handled by the global modal system via useJobOffersSubscription
  // No need to subscribe or handle accept here


  if (loading) {
    return (
      <div className="space-y-6">
        <OnlineCardSkeleton />
        {/* Active Delivery or Available Requests skeleton */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <RunnerSkeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3">
            <AvailableRequestSkeleton />
            <AvailableRequestSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Get customer info for active order (with reveal logic)
  const customerProfile = activeOrder?.customer ? {
    id: activeOrder.customer_id,
    first_name: (activeOrder.customer as any)?.first_name || null,
    last_name: (activeOrder.customer as any)?.last_name || null,
    avatar_url: (activeOrder.customer as any)?.avatar_url || null,
  } : null;

  const customerPublic = getCustomerPublicProfile(
    activeOrder?.status || 'Pending',
    customerProfile as any
  );

  return (
    <div className="space-y-6">
      {/* Online / Offline Toggle Card - Source of Truth */}
      <ShellCard 
        id="runner-online-card"
        variant="runner" 
        className="bg-[#050816] border-slate-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Radio className={cn(
                "h-4 w-4",
                isOnline ? "text-emerald-400" : "text-slate-500"
              )} />
              <Label className="text-sm font-medium text-slate-300">
                {isOnline ? "Online" : "Offline"}
              </Label>
              {hasActiveJob && isOnline && (
                <span className="text-[10px] text-emerald-300/90 ml-1">
                  • On delivery
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {hasActiveJob && isOnline
                ? "You're on an active delivery. Complete it before going offline."
                : isOnline 
                ? "You're available for new requests."
                : "You're currently offline. Go online to receive delivery requests."}
            </p>
          </div>
          <Switch
            checked={isOnline}
            onCheckedChange={handleOnlineToggle}
            disabled={updatingOnlineStatus || (hasActiveJob && isOnline)}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </ShellCard>

      {/* Active Delivery */}
      {activeOrder && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Active Delivery</h2>
          <p className="text-sm text-slate-400 mb-4">Your current delivery in progress</p>
          <ShellCard variant="runner" className="hover:border-indigo-500/30 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {canSeeCashAmount(activeOrder.status)
                      ? `$${activeOrder.requested_amount.toFixed(2)}`
                      : "Amount hidden"}
                  </div>
                  <div className="text-sm text-emerald-400 font-medium mt-1">
                    Earn ${getRunnerPayout(activeOrder).toFixed(2)}
                  </div>
                  {!canSeeCashAmount(activeOrder.status) && (
                    <p className="text-xs text-slate-400 mt-1">
                      {getCashAmountRevealMessage(activeOrder.status)}
                    </p>
                  )}
                </div>
                <StatusChip status={activeOrder.status} />
              </div>

              {/* Customer Info (with reveal logic) */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                <Avatar
                  src={customerPublic.avatarUrl || undefined}
                  fallback={customerPublic.displayName}
                  size="sm"
                  className="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {customerPublic.displayName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {getCustomerAddressDisplay(activeOrder.status, activeOrder.customer_address)}
                  </p>
                </div>
              </div>

              {activeOrder.customer_notes && (
                <div className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                  <strong className="text-slate-300">Note:</strong> {activeOrder.customer_notes}
                </div>
              )}

              <Button
                onClick={() => navigate(`/runner/deliveries/${activeOrder.id}`)}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Delivery / Update Status
              </Button>
            </div>
          </ShellCard>
        </div>
      )}


      {/* Order History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white mb-1">Order History</h2>
          <Button
            onClick={() => navigate("/runner/deliveries")}
            variant="ghost"
            className="text-slate-400 hover:text-white text-sm"
          >
            View all
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        {orderHistory.length === 0 ? (
          <div className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-12 text-center">
            <Package className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 mb-2">No order history yet</p>
            <p className="text-sm text-slate-400">Your order history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderHistory.map((order) => {
              const runnerEarning = order.historyStatus === 'Completed' ? getRunnerPayout(order) : 0;
              const orderDate = order.handoff_completed_at 
                ? new Date(order.handoff_completed_at)
                : new Date(order.created_at);
              const formattedShortDate = orderDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              const statusConfig = {
                'Completed': {
                  bg: 'bg-emerald-500/10',
                  text: 'text-emerald-400',
                  label: 'Completed'
                },
                'Skipped': {
                  bg: 'bg-yellow-500/10',
                  text: 'text-yellow-400',
                  label: 'Skipped'
                },
                'Timed-Out': {
                  bg: 'bg-red-500/10',
                  text: 'text-red-400',
                  label: 'Timed-Out'
                }
              };

              const config = statusConfig[order.historyStatus];
              
              return (
                <div
                  key={order.id}
                  onClick={() => order.historyStatus === 'Completed' ? navigate(`/runner/deliveries/${order.id}`) : undefined}
                  className={`rounded-3xl bg-[#050816] border border-white/5 px-4 py-3 flex items-center justify-between gap-3 ${
                    order.historyStatus === 'Completed' ? 'active:scale-[0.99] transition cursor-pointer hover:border-white/10' : ''
                  }`}
                >
                  <div>
                    <div className="text-base font-semibold text-white">
                      ${order.requested_amount.toFixed(2)}
                    </div>
                    {order.historyStatus === 'Completed' && (
                      <div className="text-xs text-emerald-400">
                        +${runnerEarning.toFixed(2)}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formattedShortDate}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full ${config.bg} ${config.text} text-xs font-medium`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

