import { Clock, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { getRunnerPayout } from "@/lib/payouts";
import type { OrderWithDetails } from "@/types/types";
import { formatDate, getOrderDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EarningsOrderCardProps {
  order: OrderWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Format currency
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export function EarningsOrderCard({ order, isExpanded, onToggle }: EarningsOrderCardProps) {
  const navigate = useNavigate();
  
  // Format address
  const fullAddress = order.address_snapshot
    ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city}, ${order.address_snapshot.state} ${order.address_snapshot.postal_code}`
    : order.customer_address || 'Address not available';

  // Format date
  const completedDate = order.handoff_completed_at 
    ? new Date(order.handoff_completed_at)
    : new Date(order.updated_at);
  const dateStr = formatDate(completedDate, { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Calculate duration
  const duration = getOrderDuration(order.created_at, order.handoff_completed_at || order.updated_at);

  // Customer name
  const customerName = order.customer?.first_name || 'Customer';

  return (
    <div
      className={cn(
        "rounded-3xl bg-[#050816] border border-white/5 px-4 py-3 cursor-pointer transition-all",
        isExpanded && "border-white/10"
      )}
      onClick={onToggle}
    >
      {/* Collapsed State */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">
              #{order.id.slice(0, 8)}
            </span>
            <span className="text-sm text-slate-300">·</span>
            <span className="text-sm text-slate-300">{dateStr}</span>
            <span className="text-sm text-slate-300">·</span>
            <span className="text-sm text-slate-300 truncate">{customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">
              ${order.requested_amount.toFixed(2)}
            </span>
            <StatusChip status={order.status} />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className="text-sm text-emerald-400 font-medium">
            +{formatCurrency(getRunnerPayout(order))}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Fee Breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Fee Breakdown</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Fee</span>
                <span className="text-white font-medium">
                  ${order.delivery_fee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Compliance Fee</span>
                <span className="text-white font-medium">
                  ${order.compliance_fee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                <span className="text-white">Your Earnings</span>
                <span className="text-emerald-400">
                  +{formatCurrency(getRunnerPayout(order))}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-300">Ordered</span>
                  <span className="text-slate-500 ml-2">
                    {formatDate(order.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {order.runner_accepted_at && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-300">Accepted</span>
                    <span className="text-slate-500 ml-2">
                      {formatDate(order.runner_accepted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
              {order.cash_withdrawn_at && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-300">Cash Withdrawn</span>
                    <span className="text-slate-500 ml-2">
                      {formatDate(order.cash_withdrawn_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
              {order.handoff_completed_at && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-slate-300">Completed</span>
                    <span className="text-slate-500 ml-2">
                      {formatDate(order.handoff_completed_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
              {duration && (
                <div className="flex items-start gap-2">
                  <Clock className="h-3 w-3 text-slate-500 mt-1.5 flex-shrink-0" />
                  <span className="text-slate-500 text-xs">Total time: {duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Delivery Address</h3>
            <p className="text-sm text-slate-400">{fullAddress}</p>
          </div>

          {/* View Details Link */}
          <div className="pt-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/runner/deliveries/${order.id}`);
              }}
              variant="ghost"
              className="w-full text-sm text-slate-300 hover:text-white hover:bg-white/5"
            >
              <Eye className="mr-2 h-4 w-4" />
              View delivery details
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}

