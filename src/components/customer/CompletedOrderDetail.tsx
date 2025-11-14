import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, DollarSign, Clock, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { RatingStars } from "@/components/common/RatingStars";
import { rateRunner } from "@/db/api";
import { toast } from "sonner";
import type { OrderWithDetails } from "@/types/types";
import { formatDate, getOrderDuration } from "@/lib/utils";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";

interface CompletedOrderDetailProps {
  order: OrderWithDetails;
  onReorder?: (order: OrderWithDetails) => void;
}

/**
 * CompletedOrderDetail Component
 * 
 * Unified layout for completed orders showing:
 * - Status & outcome
 * - Quick summary
 * - Runner block with rating
 * - Actions (Reorder, Report issue)
 * - Details section (address, fees, timeline)
 */
export function CompletedOrderDetail({ order, onReorder }: CompletedOrderDetailProps) {
  const navigate = useNavigate();
  const [submittingRating, setSubmittingRating] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const hasRunnerRating = !!order.runner_rating;

  // Format address
  const fullAddress = order.address_snapshot
    ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city}, ${order.address_snapshot.state} ${order.address_snapshot.postal_code}`
    : order.customer_address || 'Address not available';

  const shortAddress = fullAddress.split(',').slice(-2).join(',').trim();

  // Format date/time
  const completedDate = order.handoff_completed_at 
    ? new Date(order.handoff_completed_at)
    : new Date(order.updated_at);
  const dateStr = formatDate(completedDate, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = completedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Runner info
  const runner = order.runner;
  const runnerName = runner?.first_name || 'Runner';
  const runnerFunFact = (runner as any)?.fun_fact || null;
  const runnerAvgRating = (runner as any)?.avg_runner_rating || null;

  // Handle reorder
  const handleReorder = () => {
    if (onReorder) {
      onReorder(order);
    } else {
      // Default reorder logic
      const params = new URLSearchParams();
      params.set('amount', order.requested_amount.toString());
      if (order.address_id) {
        params.set('address_id', order.address_id);
      } else if (order.address_snapshot) {
        sessionStorage.setItem('reorder_address_snapshot', JSON.stringify(order.address_snapshot));
      }
      navigate(`/customer/request?${params.toString()}`);
    }
  };

  // Handle report issue
  const handleReportIssue = () => {
    // For now, open mailto or show placeholder
    const subject = `Issue with Order ${order.id.slice(0, 8)}`;
    const body = `I'm reporting an issue with my completed order.\n\nOrder ID: ${order.id}\nDate: ${dateStr}\nAmount: $${order.requested_amount.toFixed(2)}`;
    window.location.href = `mailto:support@benjamin.cash?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle rating
  const handleRateRunner = async (rating: number) => {
    try {
      setSubmittingRating(true);
      await rateRunner(order.id, rating);
      (order as any).runner_rating = rating;
      toast.success("Rating submitted successfully");
    } catch (e: any) {
      console.error("Error rating runner:", e);
      toast.error(e.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/deliveries");
  };

  return (
    <CustomerScreen
      title="Completed"
      subtitle={`All set. Thanks for trusting Benjamin. • Order #${order.id.slice(0, 8)}`}
      headerLeft={
        <button
          onClick={handleBack}
          className="p-2 rounded-full transition-colors -ml-2"
          aria-label="Back to orders"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
      }
      map={<div className="flex flex-col h-full bg-[#F5F7FA]" />}
      footer={
        <RequestFlowBottomBar
          mode="home"
          onPrimary={handleReorder}
          primaryLabel="Reorder"
          useFixedPosition={true}
        />
      }
    >
      <div className="space-y-4">
        {/* 2. Quick Summary Row */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-zinc-200">
          <div>
              <div className="text-xs text-zinc-500 mb-0.5">Amount delivered</div>
              <div className="text-2xl font-bold text-zinc-900">
                ${order.requested_amount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-0.5">Total paid</div>
              <div className="text-lg font-semibold text-zinc-900">
                ${order.total_payment.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-0.5">Delivered to</div>
              <div className="text-sm font-medium text-zinc-700">{shortAddress}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-0.5">Date & time</div>
              <div className="text-sm font-medium text-zinc-700">
                {dateStr} · {timeStr}
              </div>
            </div>
          </div>

        {/* 3. Runner Block */}
        {runner && (
          <div className="pb-4 border-b border-zinc-200">
            <div className="flex items-start gap-4">
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-3 flex-1">
                <Avatar
                  src={runner.avatar_url || undefined}
                  fallback={runnerName}
                  size="md"
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-900">{runnerName}</div>
                  {runnerAvgRating && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RatingStars value={Math.round(runnerAvgRating)} readOnly size="sm" />
                      <span className="text-xs text-zinc-500">
                        {runnerAvgRating.toFixed(1)}
                        {runner.runner_rating_count && ` (${runner.runner_rating_count} reviews)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Right: Fun Fact */}
              {runnerFunFact && (
                <div className="text-xs text-zinc-500 text-right max-w-[140px]">
                  {runnerFunFact}
                </div>
              )}
            </div>

            {/* Rating for this order */}
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-900">
                  {hasRunnerRating ? "Your rating" : "Rate your runner"}
                </span>
              </div>
              <RatingStars
                value={order.runner_rating ?? 0}
                readOnly={hasRunnerRating || submittingRating}
                onChange={hasRunnerRating || submittingRating ? undefined : handleRateRunner}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* 4. Actions - Reorder moved to footer */}
        <button
          onClick={handleReportIssue}
          className="w-full text-sm text-red-500 underline text-center py-2"
        >
          Report an issue
        </button>

        {/* 5. Details Section */}
        <div>
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="w-full flex items-center justify-between py-3 text-left"
          >
            <h3 className="text-sm font-semibold text-zinc-900">Delivery details</h3>
            {detailsExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </button>

          {detailsExpanded && (
            <div className="pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Delivery Address */}
              <div>
                <div className="flex items-start gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-zinc-500 mb-1">Delivery address</div>
                    <div className="text-sm text-zinc-700">{fullAddress}</div>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-2">Fee breakdown</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Delivery Fee</span>
                    <span className="font-medium text-zinc-900">
                      ${order.delivery_fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Compliance Fee</span>
                    <span className="font-medium text-zinc-900">
                      ${order.compliance_fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Platform Fee</span>
                    <span className="font-medium text-zinc-900">
                      ${order.profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-200 font-semibold">
                    <span className="text-zinc-900">Total Paid</span>
                    <span className="text-zinc-900">
                      ${order.total_payment.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-2">Timeline</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-zinc-900">Ordered</span>
                      <span className="text-zinc-500 ml-2">
                        {formatDate(order.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {order.runner_accepted_at && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-900">Runner assigned</span>
                        <span className="text-zinc-500 ml-2">
                          {formatDate(order.runner_accepted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.cash_withdrawn_at && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-900">Cash withdrawn</span>
                        <span className="text-zinc-500 ml-2">
                          {formatDate(order.cash_withdrawn_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.runner_at_atm_at && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-900">On the way</span>
                        <span className="text-zinc-500 ml-2">
                          {formatDate(order.runner_at_atm_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.handoff_completed_at && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-900">Completed</span>
                        <span className="text-zinc-500 ml-2">
                          {formatDate(order.handoff_completed_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </CustomerScreen>
  );
}

