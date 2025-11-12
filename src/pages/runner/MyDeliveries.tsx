import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getRunnerOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { getRunnerPayout } from "@/lib/payouts";
import type { OrderWithDetails, Order } from "@/types/types";
import { useProfile } from "@/contexts/ProfileContext";
import { RunnerSubpageLayout } from "@/components/layout/RunnerSubpageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { RatingStars } from "@/components/common/RatingStars";
import { formatDate } from "@/lib/utils";

function shortId(orderId: string): string {
  return orderId.slice(0, 8);
}

function formattedDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return formatDate(new Date(dateString), { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusPill(status: string): string {
  if (status === 'Completed') {
    return 'bg-emerald-500/10 text-emerald-400 rounded-full px-3 py-1 text-xs font-medium';
  }
  if (status === 'Cancelled') {
    return 'bg-red-500/10 text-red-400 rounded-full px-3 py-1 text-xs font-medium';
  }
  return 'bg-slate-500/10 text-slate-400 rounded-full px-3 py-1 text-xs font-medium';
}

export default function MyDeliveries() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await getRunnerOrders();
      // Only show completed orders in deliveries list
      const completed = data.filter(o => o.status === "Completed");
      setOrders(completed.sort((a, b) => {
        const dateA = a.handoff_completed_at ? new Date(a.handoff_completed_at) : new Date(a.updated_at);
        const dateB = b.handoff_completed_at ? new Date(b.handoff_completed_at) : new Date(b.updated_at);
        return dateB.getTime() - dateA.getTime();
      }));
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Handle realtime order updates
  const handleOrderUpdate = useCallback((order: Order) => {
    if (order.status === 'Completed') {
      loadOrders();
    }
  }, []);

  // Subscribe to runner's orders
  useOrdersRealtime({
    filter: { mode: 'runner', runnerId: profile?.id },
    onUpdate: handleOrderUpdate,
    enabled: !!profile,
  });

  return (
    <RunnerSubpageLayout title="My deliveries">
      <section className="space-y-3 mt-2">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Loading deliveries...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-12 text-center">
            <p className="text-slate-300 mb-2">No completed deliveries yet</p>
            <p className="text-sm text-slate-400">
              Your delivery history will appear here
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const runnerEarning = getRunnerPayout(order);
            const completedDate = order.handoff_completed_at || order.updated_at;
            const dateFormatted = formattedDate(completedDate);
            
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/runner/deliveries/${order.id}`)}
                className="w-full text-left rounded-3xl bg-[#050816] border border-white/5 px-4 py-3 hover:border-white/10 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs text-slate-500 mb-1">
                      #{shortId(order.id)} · {dateFormatted}
                    </span>
                    <span className="text-sm text-slate-300">
                      {order.customer?.first_name || "Customer"}
                    </span>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-white font-semibold">
                      ${order.requested_amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-400">
                      +${runnerEarning.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={statusPill(order.status)}>Completed</span>
                  {order.customer_rating_by_runner && (
                    <RatingStars
                      value={order.customer_rating_by_runner}
                      readOnly
                      size="sm"
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </section>
    </RunnerSubpageLayout>
  );
}
