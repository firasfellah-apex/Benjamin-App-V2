/**
 * Customer Delivery Detail Page
 * 
 * Detailed view of a single past delivery with timeline, cost breakdown, runner info, and rating
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Clock, MapPin, DollarSign } from "@/lib/icons";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { StatusBadge } from "@/components/customer/deliveries/StatusBadge";
import { DeliveryTimeline, type TimelineEvent } from "@/components/customer/deliveries/DeliveryTimeline";
import { RatingStars } from "@/components/common/RatingStars";
import { useCustomerDeliveries } from "@/features/customer/hooks/useCustomerDeliveries";
import { rateRunner } from "@/db/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";
import type { CustomerDelivery } from "@/types/delivery";

/**
 * Build timeline events from delivery data
 */
function buildTimelineEvents(delivery: CustomerDelivery): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  if (delivery.deliveredAt) {
    const deliveredDate = new Date(delivery.deliveredAt);
    events.push({
      id: "delivered",
      label: "Delivered to your door",
      time: deliveredDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      icon: <Check className="w-3 h-3" />,
      isDone: true,
    });
  }
  
  if (delivery.cashWithdrawnAt) {
    const withdrawnDate = new Date(delivery.cashWithdrawnAt);
    events.push({
      id: "withdrawn",
      label: "Runner picked up cash",
      time: withdrawnDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      icon: <DollarSign className="w-3 h-3" />,
      isDone: true,
    });
  }
  
  if (delivery.runnerAtAtmAt) {
    const atmDate = new Date(delivery.runnerAtAtmAt);
    events.push({
      id: "atm",
      label: "Cash prepared",
      time: atmDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      icon: <Clock className="w-3 h-3" />,
      isDone: true,
    });
  }
  
  if (delivery.runnerAcceptedAt) {
    const acceptedDate = new Date(delivery.runnerAcceptedAt);
    events.push({
      id: "accepted",
      label: "Order created",
      time: acceptedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      icon: <MapPin className="w-3 h-3" />,
      isDone: true,
    });
  }
  
  // Fallback: if no events, show at least the creation
  if (events.length === 0) {
    const createdDate = new Date(delivery.createdAt);
    events.push({
      id: "created",
      label: "Order created",
      time: createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      icon: <MapPin className="w-3 h-3" />,
      isDone: true,
    });
  }
  
  // Sort by time (most recent first, then reverse for display)
  return events.sort((a, b) => {
    const timeA = a.time ? new Date(`2000-01-01 ${a.time}`).getTime() : 0;
    const timeB = b.time ? new Date(`2000-01-01 ${b.time}`).getTime() : 0;
    return timeB - timeA;
  }).reverse();
}

export default function CustomerDeliveryDetail() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { deliveries, isLoading } = useCustomerDeliveries();
  
  // Try to get delivery from location state first (for instant render)
  const [delivery, setDelivery] = useState<CustomerDelivery | null>(
    location.state?.delivery || null
  );
  const [submittingRating, setSubmittingRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // If not in state, find from deliveries list
  useEffect(() => {
    if (!delivery && deliveryId && deliveries.length > 0) {
      const found = deliveries.find(d => d.id === deliveryId);
      if (found) {
        setDelivery(found);
      }
    }
  }, [delivery, deliveryId, deliveries]);

  // Update delivery when deliveries list updates
  useEffect(() => {
    if (deliveryId && deliveries.length > 0) {
      const found = deliveries.find(d => d.id === deliveryId);
      if (found) {
        setDelivery(found);
      }
    }
  }, [deliveryId, deliveries]);

  const handleBack = () => {
    navigate('/customer/deliveries');
  };

  const handleRateRunner = async (rating: number) => {
    if (!delivery) return;
    
    try {
      setSubmittingRating(true);
      await rateRunner(delivery.id, rating);
      
      // Update local state immediately for instant UI feedback
      setDelivery({
        ...delivery,
        customerRating: rating,
      });
      
      toast.success("Rating submitted successfully");
    } catch (error: any) {
      console.error("Error rating runner:", error);
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
      setSelectedRating(null);
    }
  };

  const handleReportProblem = () => {
    if (!delivery) return;
    const subject = `Issue with Delivery ${delivery.id.slice(0, 8)}`;
    const body = `I'm reporting an issue with my delivery.\n\nDelivery ID: ${delivery.id}\nDate: ${delivery.deliveredAt ? formatDate(new Date(delivery.deliveredAt)) : 'N/A'}\nAmount: $${delivery.amountDelivered.toFixed(2)}`;
    window.location.href = `mailto:support@benjamin.cash?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Build timeline events
  const timelineEvents = useMemo(() => {
    if (!delivery) return [];
    return buildTimelineEvents(delivery);
  }, [delivery]);

  // Calculate service fee
  const serviceFee = useMemo(() => {
    if (!delivery) return 0;
    return Math.max(0, delivery.totalPaid - delivery.amountDelivered);
  }, [delivery]);

  // Loading state
  if (isLoading && !delivery) {
    return (
      <CustomerScreen
        loading={true}
        title="Loading..."
        headerLeft={
          <button
            onClick={handleBack}
            className="p-2 rounded-full transition-colors -ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        }
        map={<div className="flex flex-col h-full bg-[#F5F7FA]" />}
      >
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </CustomerScreen>
    );
  }

  // Not found state
  if (!delivery) {
    return (
      <CustomerScreen
        title="Delivery not found"
        headerLeft={
          <button
            onClick={handleBack}
            className="p-2 rounded-full transition-colors -ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        }
        map={<div className="flex flex-col h-full bg-[#F5F7FA]" />}
      >
        <p className="text-sm text-slate-500">This delivery could not be found.</p>
      </CustomerScreen>
    );
  }

  const runnerInitials = delivery.runner?.displayName
    ? delivery.runner.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <CustomerScreen
      title={`Cash delivery to ${delivery.locationLabel}`}
      subtitle={`$${delivery.amountDelivered.toLocaleString()} received · You paid $${delivery.totalPaid.toFixed(2)}`}
      actions={<StatusBadge status={delivery.status} />}
      headerLeft={
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
      }
      map={<div className="flex flex-col h-full bg-[#F5F7FA]" />}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        {/* Timeline */}
        {timelineEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Timeline</h3>
            <DeliveryTimeline events={timelineEvents} />
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Cash received</span>
            <span className="font-medium text-slate-900">
              ${delivery.amountDelivered.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Service fee</span>
            <span className="text-slate-900">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between">
            <span className="font-medium text-slate-700">Total paid</span>
            <span className="font-semibold text-slate-900">
              ${delivery.totalPaid.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Runner Info + Rating */}
        {delivery.runner && (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
                {delivery.runner.avatarUrl ? (
                  <img
                    src={delivery.runner.avatarUrl}
                    alt={delivery.runner.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  runnerInitials
                )}
              </div>
              <div className="text-sm flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {delivery.runner.displayName}
                </div>
                {delivery.runner.averageRating && (
                  <div className="text-xs text-slate-500">
                    ★ {delivery.runner.averageRating.toFixed(1)} average rating
                  </div>
                )}
              </div>
            </div>

            {/* Rating CTA */}
            {delivery.customerRating ? (
              <button
                disabled
                className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600 flex items-center gap-1"
              >
                ★ You rated {delivery.customerRating.toFixed(1)}
              </button>
            ) : delivery.status === "delivered" ? (
              <div className="flex flex-col items-end gap-2">
                {selectedRating ? (
                  <div className="flex items-center gap-2">
                    <RatingStars
                      value={selectedRating || 0}
                      onChange={setSelectedRating}
                    />
                    <button
                      onClick={() => handleRateRunner(selectedRating)}
                      disabled={submittingRating}
                      className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                    >
                      {submittingRating ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedRating(5)}
                    className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition-colors"
                  >
                    Rate runner
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Support footer */}
        <button
          onClick={handleReportProblem}
          className="mt-5 text-xs text-slate-400 underline underline-offset-2 transition-colors"
        >
          Report a problem with this delivery
        </button>
      </motion.div>
    </CustomerScreen>
  );
}

