import { useEffect, useState, useCallback } from "react";
import { DollarSign, Calendar } from "lucide-react";
import { getRunnerOrders } from "@/db/api";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useProfile } from "@/contexts/ProfileContext";
import { getRunnerPayout } from "@/lib/payouts";
import type { OrderWithDetails, Order } from "@/types/types";
import { formatDate } from "@/lib/utils";
import { EarningsOrderCard } from "@/components/runner/EarningsOrderCard";
import {
  EarningsSummarySkeleton,
  PayoutCardSkeleton,
  EarningsHistoryItemSkeleton,
} from "@/components/runner/RunnerSkeleton";

/**
 * Earnings Summary Card Component
 */
const EarningsSummaryCard = ({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) => (
  <div className="rounded-3xl bg-[#050816] border border-white/5 px-3 py-3 flex flex-col">
    <span className="text-xs text-slate-400">{label}</span>
    <span className="mt-1 text-2xl font-semibold text-white truncate">
      {amount}
    </span>
    <span className="mt-0.5 text-[10px] text-slate-500">
      Completed earnings
    </span>
  </div>
);

/**
 * Format currency
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export default function Earnings() {
  const { profile } = useProfile();
  const [completedOrders, setCompletedOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  // Load earnings data
  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const runnerOrders = await getRunnerOrders();
      
      // Filter completed orders
      const completed = runnerOrders.filter(o => o.status === 'Completed');
      setCompletedOrders(completed.sort((a, b) => {
        const dateA = a.handoff_completed_at ? new Date(a.handoff_completed_at) : new Date(a.updated_at);
        const dateB = b.handoff_completed_at ? new Date(b.handoff_completed_at) : new Date(b.updated_at);
        return dateB.getTime() - dateA.getTime();
      }));

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
    } catch (error) {
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // Subscribe to realtime updates for completed orders
  const handleOrderUpdate = useCallback((order: Order) => {
    if (order.status === 'Completed') {
      // Reload earnings when order is completed
      loadEarnings();
    }
  }, [loadEarnings]);

  useOrdersRealtime({
    filter: { mode: 'runner', runnerId: profile?.id },
    onUpdate: handleOrderUpdate,
    enabled: !!profile?.id,
  });

  // Calculate next payout date (mock - first of next month)
  const getNextPayoutDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return formatDate(nextMonth, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Calculate total pending payout (all completed orders this month)
  const pendingPayout = earnings.thisMonth;
  const formattedNextPayoutDate = getNextPayoutDate();

  // Toggle expanded order
  const handleToggleOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Earnings Overview Cards Skeleton */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <EarningsSummarySkeleton />
          <EarningsSummarySkeleton />
          <EarningsSummarySkeleton />
        </div>

        {/* Payout Card Skeleton */}
        <PayoutCardSkeleton />

        {/* Earnings History Skeleton */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-white mb-1">Earnings history</h2>
          <p className="text-sm text-slate-400 mb-3">Your completed deliveries and earnings</p>
          <div className="space-y-3">
            <EarningsHistoryItemSkeleton />
            <EarningsHistoryItemSkeleton />
            <EarningsHistoryItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <EarningsSummaryCard label="Today" amount={formatCurrency(earnings.today)} />
        <EarningsSummaryCard label="This Week" amount={formatCurrency(earnings.thisWeek)} />
        <EarningsSummaryCard label="This Month" amount={formatCurrency(earnings.thisMonth)} />
      </div>

      {/* Upcoming Payout Card */}
      <div className="mt-5 rounded-3xl bg-[#050816] border border-white/5 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Upcoming payout</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
            Scheduled
          </span>
        </div>
        <div className="mt-1 text-base font-semibold text-white">
          {formattedNextPayoutDate}
        </div>
        {pendingPayout > 0 && (
          <div className="mt-0.5 text-xs text-slate-400">
            {formatCurrency(pendingPayout)} estimated from completed jobs
          </div>
        )}
      </div>

      {/* Earnings History */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-white mb-1">Earnings history</h2>
        <p className="text-sm text-slate-400 mb-3">Your completed deliveries and earnings</p>

        <div className="space-y-3">
          {completedOrders.length === 0 ? (
            <div className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-12 text-center">
              <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 mb-2">No earnings yet</p>
              <p className="text-sm text-slate-400">
                Your earnings will appear here after your first delivery
              </p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <EarningsOrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrderId === order.id}
                onToggle={() => handleToggleOrder(order.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
