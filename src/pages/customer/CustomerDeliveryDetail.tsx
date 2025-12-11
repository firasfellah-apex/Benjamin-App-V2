/**
 * Customer Delivery Detail Page
 * 
 * Detailed view of a single past delivery with timeline, cost breakdown, runner info, and rating
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Clock, MapPin, DollarSign, Star } from "@/lib/icons";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { DeliveryTimeline, type TimelineEvent } from "@/components/customer/deliveries/DeliveryTimeline";
import { CompletionRatingModal } from "@/components/customer/CompletionRatingModal";
import { ReportIssueSheet } from "@/components/customer/ReportIssueSheet";
import { useCustomerDeliveries } from "@/features/customer/hooks/useCustomerDeliveries";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { getOrderById } from "@/db/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import type { CustomerDelivery } from "@/types/delivery";
import type { OrderWithDetails } from "@/types/types";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCustomerAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { validateReorderEligibility } from "@/features/orders/reorderEligibility";
import { ReorderBlockedModal } from "@/components/customer/ReorderBlockedModal";

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
      label: "Request received",
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
      label: "Request received",
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
  const { setBottomSlot } = useCustomerBottomSlot();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { addresses } = useCustomerAddresses();
  
  // Try to get delivery from location state first (for instant render)
  const [delivery, setDelivery] = useState<CustomerDelivery | null>(
    location.state?.delivery || null
  );
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showReportIssueSheet, setShowReportIssueSheet] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{ ok: boolean; reason?: 'missing_bank' | 'missing_address' | 'blocked_order' | 'runner_disabled'; message?: string } | null>(null);

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

  // Load full order for reorder functionality
  useEffect(() => {
    if (deliveryId && !order && !loadingOrder) {
      setLoadingOrder(true);
      getOrderById(deliveryId)
        .then((data) => {
          if (data) setOrder(data);
        })
        .catch((error) => {
          console.error("Error loading order for reorder:", error);
        })
        .finally(() => {
          setLoadingOrder(false);
        });
    }
  }, [deliveryId, order, loadingOrder]);

  const handleBack = () => {
    navigate('/customer/deliveries');
  };

  // Format delivery timestamp for subtitle
  const formattedDeliveryTime = useMemo(() => {
    if (!delivery?.deliveredAt) return "";
    
    const deliveredDate = new Date(delivery.deliveredAt);
    const now = new Date();
    const sameDay = deliveredDate.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = deliveredDate.toDateString() === yesterday.toDateString();
    
    const time = deliveredDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    
    if (sameDay) {
      return `Today · ${time}`;
    }
    
    if (isYesterday) {
      return `Yesterday · ${time}`;
    }
    
    const datePart = deliveredDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    
    return `${datePart} · ${time}`;
  }, [delivery?.deliveredAt]);

  const handleRated = useCallback(() => {
    // Refetch delivery to get updated rating
    // The useCustomerDeliveries hook should refetch automatically via query invalidation
    // For now, we'll just close the modal and let the user refresh if needed
    // In a production app, we'd invalidate the query cache here
  }, []);

  const handleReorder = useCallback(() => {
    if (isNavigating) return; // Prevent double-clicks
    
    if (!order) {
      toast.error("Order data not available for reorder");
      return;
    }

    // Run reorder eligibility check
    const result = validateReorderEligibility({
      profile: profile || null,
      addresses: addresses || [],
      previousOrder: order,
    });
    
    if (!result.ok) {
      // Show blocked modal
      setEligibilityResult(result);
      setShowBlockedModal(true);
      return;
    }

    // All checks passed - proceed with reorder
    setIsNavigating(true);
    
    const params = new URLSearchParams();
    params.set('amount', order.requested_amount.toString());
    
    if (order.address_id) {
      params.set('address_id', order.address_id);
    } else if (order.address_snapshot) {
      sessionStorage.setItem('reorder_address_snapshot', JSON.stringify(order.address_snapshot));
    }
    
    // Clear bottom nav before navigation to prevent glitches
    setBottomSlot(null);
    
    navigate(`/customer/request?${params.toString()}`);
  }, [order, navigate, isNavigating, setBottomSlot, profile, addresses]);
  
  const handleStartNewRequest = useCallback(() => {
    // Navigate to normal order flow (no reorder params)
    setBottomSlot(null);
    navigate('/customer/request');
  }, [navigate, setBottomSlot]);

  const handleReportProblem = useCallback(() => {
    if (!order) {
      toast.error("Order data not available. Please wait a moment and try again.");
      return;
    }
    setShowReportIssueSheet(true);
  }, [order]);

  // Memoize bottom nav to prevent glitching/flashing
  const bottomNav = useMemo(() => {
    if (!delivery || isNavigating) return null;

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[70] w-screen max-w-none bg-white border-t border-slate-200/70">
        <div className="w-full px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
          {/* Primary CTA */}
          <div className="flex w-full gap-3 items-center justify-center mb-2">
            <Button
              type="button"
              onClick={handleReorder}
              disabled={!order || loadingOrder || isNavigating}
              className="w-full h-14"
            >
              {loadingOrder || isNavigating ? "Loading..." : "Reorder to this Address"}
            </Button>
          </div>
          
          {/* Secondary Action: Report Problem */}
          <button
            onClick={handleReportProblem}
            disabled={isNavigating || !order}
            className="w-full text-xs text-slate-400 text-center py-2 transition-colors hover:text-slate-600 disabled:opacity-50"
          >
            Report a problem with this order
          </button>
        </div>
      </nav>
    );
  }, [delivery, order, loadingOrder, isNavigating, handleReorder, handleReportProblem]);

  // Set bottom nav - only update when bottomNav changes
  useEffect(() => {
    if (isNavigating) {
      setBottomSlot(null);
      return;
    }
    setBottomSlot(bottomNav);
    return () => {
      setBottomSlot(null);
    };
  }, [bottomNav, isNavigating, setBottomSlot]);

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
        title="Loading..."
        showBack={true}
        onBack={handleBack}
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
        showBack={true}
        onBack={handleBack}
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

  // Fixed content: divider under title/subtitle (matches deliveries history page)
  const fixedContent = (
    <>
      <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
    </>
  );

  // Show appropriate subtitle based on order status
  const subtitle = delivery.status === 'cancelled' 
    ? "Cancelled"
    : (formattedDeliveryTime ? `Delivered • ${formattedDeliveryTime}` : "Delivered");

  return (
    <CustomerScreen
      title={`Cash delivery to ${delivery.locationLabel}`}
      subtitle={subtitle}
      showBack={true}
      onBack={handleBack}
      fixedContent={fixedContent}
      customBottomPadding="calc(120px + max(24px, env(safe-area-inset-bottom)))"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        {/* Timeline */}
        {timelineEvents.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Timeline</h3>
            <DeliveryTimeline events={timelineEvents} />
          </div>
        )}

        {/* Money Summary Card */}
        <div className="text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Cash Received</span>
            <span className="font-medium text-slate-900">
              ${delivery.amountDelivered.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Service Fee</span>
            <span className="text-slate-900">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between">
            <span className="font-semibold text-slate-900">Total Paid</span>
            <span className="font-semibold text-slate-900">
              ${delivery.totalPaid.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[6px] bg-[#F7F7F7] -mx-6 my-5" />

        {/* Runner Section */}
        {delivery.runner && (
          <div className="flex items-center gap-3">
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
                {delivery.runner.displayName.split(' ')[0]}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Your Benjamin runner
              </div>
            </div>
            
            {/* Rating - Yellow button matching LastDeliveryCard */}
            {delivery.status === "delivered" && (
              <>
                {delivery.customerRating ? (
                  <span className="inline-flex items-center text-[11px] text-slate-500 flex-shrink-0">
                    <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                    {delivery.customerRating.toFixed(1)} · Your rating
                  </span>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setRatingModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-yellow-400 text-sm font-semibold border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400 active:scale-[0.98] active:opacity-90 transition-all duration-150 flex-shrink-0"
                    style={{ color: '#D97708' }}
                  >
                    <span className="text-base leading-[0]" style={{ color: '#D97708' }}>★</span>
                    <span>Rate Runner</span>
                  </Button>
                )}
              </>
            )}
          </div>
        )}

      </motion.div>

      {/* Rating Modal */}
      {order && (
        <CompletionRatingModal
          order={order}
          open={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          onRated={handleRated}
        />
      )}

      {/* Report Issue Sheet */}
      {order && (
        <ReportIssueSheet
          open={showReportIssueSheet}
          order={order}
          onClose={() => setShowReportIssueSheet(false)}
        />
      )}

      {/* Reorder Blocked Modal */}
      {eligibilityResult && (
        <ReorderBlockedModal
          open={showBlockedModal}
          onOpenChange={setShowBlockedModal}
          eligibilityResult={eligibilityResult}
          onStartNewRequest={handleStartNewRequest}
        />
      )}
    </CustomerScreen>
  );
}

