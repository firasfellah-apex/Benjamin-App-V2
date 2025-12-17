import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { getOrderById, advanceOrderStatus, generateOTP, verifyOTP, confirmCount, rateCustomerByRunner, markRunnerArrived } from "@/db/api";
import { supabase } from "@/db/supabase";
import { useOrderRealtime } from "@/hooks/useOrdersRealtime";
import type { OrderWithDetails, OrderStatus, Order } from "@/types/types";
import { Avatar } from "@/components/common/Avatar";
import { triggerConfetti } from "@/lib/confetti";
import { strings } from "@/lib/strings";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { 
  canConfirmAtATM
} from "@/lib/revealRunnerView";
import { RunnerSubpageLayout } from "@/components/layout/RunnerSubpageLayout";
import { RatingStars } from "@/components/common/RatingStars";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDate } from "@/lib/utils";
import { RunnerDirectionsMap, type Location } from "@/components/maps/RunnerDirectionsMap";
import { resolveDeliveryStyleFromOrder, getDeliveryStyleCopy, getArrivalInstruction, getOtpFooterText, getDeliveryStyleShortHint, getDeliveryStyleChipLabel } from "@/lib/deliveryStyle";
import { useProfile } from "@/contexts/ProfileContext";

function shortId(orderId: string): string {
  return orderId.slice(0, 8);
}

export default function RunnerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [runnerArrived, setRunnerArrived] = useState(false);
  const [submittingCustomerRating, setSubmittingCustomerRating] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [countCooldownStart, setCountCooldownStart] = useState<Date | null>(null);
  const [countCooldownRemaining, setCountCooldownRemaining] = useState(0);
  const [isCountingStep, setIsCountingStep] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [completing, setCompleting] = useState(false);
  const unreadCount = useUnreadMessages(orderId || null);

  // Check if runner has already marked arrival (persist across navigation)
  const checkRunnerArrived = async (orderId: string, orderStatus: OrderStatus): Promise<boolean> => {
    if (orderStatus !== "Pending Handoff") {
      return false;
    }

    try {
      const { data: events, error } = await supabase
        .from("order_events")
        .select("id, client_action_id")
        .eq("order_id", orderId)
        .eq("client_action_id", "runner_arrived")
        .limit(1);

      if (error) {
        console.warn('[RunnerOrderDetail] Error checking runner arrival:', error);
        return false;
      }

      return events && events.length > 0;
    } catch (error) {
      console.error('[RunnerOrderDetail] Error checking runner arrival:', error);
      return false;
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    
    // Debug: Log pickup fields when order loads
    if (data) {
      console.log('[RunnerOrderDetail] 📍 Order loaded with pickup fields:', {
        orderId: data.id,
        pickup_lat: (data as any).pickup_lat,
        pickup_lng: (data as any).pickup_lng,
        pickup_name: (data as any).pickup_name,
        pickup_address: (data as any).pickup_address,
        atm_id: (data as any).atm_id,
        hasAddressSnapshot: !!data.address_snapshot,
        addressSnapshotLat: data.address_snapshot?.latitude,
        addressSnapshotLng: data.address_snapshot?.longitude,
      });
    }
    
    setOrder(data);
    
    if (data?.status === "Completed") {
      setRunnerArrived(false);
      setOtpValue("");
      setOtpVerified(false);
      setCountCooldownStart(null);
      setCountCooldownRemaining(0);
      setLoading(false);
    } else if (data) {
      // Check if runner has already marked arrival (persist across navigation)
      // MUST check this before setting loading to false to prevent UI flicker
      if (data.status === "Pending Handoff") {
        const hasArrived = await checkRunnerArrived(data.id, data.status);
        setRunnerArrived(hasArrived);
        console.log('[RunnerOrderDetail] Runner arrival status:', hasArrived);
      } else {
        // If not in Pending Handoff, ensure runnerArrived is false
        setRunnerArrived(false);
      }
      
      // Check if OTP was already verified (for counted mode)
      const otpVerifiedAt = (data as any).otp_verified_at;
      const deliveryStyle = resolveDeliveryStyleFromOrder(data);
      
      // Debug logging for delivery style
      console.log('[RunnerOrderDetail] Delivery style check:', {
        orderId: data.id,
        delivery_style: data.delivery_style || 'NOT SET',
        delivery_mode: data.delivery_mode || 'NOT SET',
        resolvedStyle: deliveryStyle,
        isCounted: deliveryStyle === 'COUNTED',
        otpVerifiedAt: otpVerifiedAt || 'NOT SET',
      });
      
      // If OTP is verified in database OR we already have otpVerified set to true locally,
      // and we're in the right state, set the counting step
      if (data.status === "Pending Handoff" && deliveryStyle === 'COUNTED') {
        if (otpVerifiedAt) {
          // Database confirms OTP is verified
          setOtpVerified(true);
          setIsCountingStep(true);
          // Start countdown timer if not already started
          if (!countCooldownStart) {
            setCountdown(20);
            setCountCooldownRemaining(20);
          }
        }
        // If otpVerifiedAt is not in DB yet but we have local otpVerified state,
        // preserve it (don't reset to false) - the DB update might still be propagating
      }
      
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  const handleOrderUpdate = useCallback(async (updatedOrder: Order) => {
    if (!orderId || !updatedOrder) return;
    
    // Debug logging for delivery style in realtime updates
    const resolvedStyle = resolveDeliveryStyleFromOrder(updatedOrder);
    console.log('[RunnerOrderDetail] Realtime order update:', {
      orderId: updatedOrder.id,
      delivery_style: updatedOrder.delivery_style || 'NOT SET',
      delivery_mode: updatedOrder.delivery_mode || 'NOT SET',
      resolvedStyle,
    });
    
    setOrder((prev) => {
      if (!prev || prev.id !== updatedOrder.id) return prev;
      return {
        ...prev,
        ...updatedOrder,
      } as OrderWithDetails;
    });
    
    if (updatedOrder.status === "Completed") {
      setRunnerArrived(false);
      setOtpValue("");
    } else if (updatedOrder.status === "Pending Handoff") {
      // ALWAYS check if runner has already marked arrival when order status is Pending Handoff
      // This ensures arrival state persists across navigation and real-time updates
      const hasArrived = await checkRunnerArrived(updatedOrder.id, updatedOrder.status);
      setRunnerArrived(hasArrived);
      console.log('[RunnerOrderDetail] Real-time update - Runner arrival status:', hasArrived);
    } else {
      // For any other status, ensure runnerArrived is false (only valid for Pending Handoff)
      setRunnerArrived(false);
    }
    
    // Fetch full order details to ensure we have the latest data
    try {
      const data = await getOrderById(orderId);
      if (data && data.id === orderId) {
        setOrder(data);
        // Re-check arrival status after fetching full details if status is Pending Handoff
        if (data.status === "Pending Handoff") {
          const hasArrived = await checkRunnerArrived(data.id, data.status);
          setRunnerArrived(hasArrived);
        } else if (data.status === "Completed") {
          setRunnerArrived(false);
          setOtpValue("");
        }
      }
    } catch (error) {
      console.error('[RunnerOrderDetail] Error fetching full order details:', error);
    }
  }, [orderId]);

  useOrderRealtime(orderId, {
    onUpdate: handleOrderUpdate,
  });

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!orderId) return;

    setUpdating(true);
    try {
      const updatedOrder = await advanceOrderStatus(orderId, newStatus);
      if (updatedOrder) {
        toast.success(strings.toasts.statusUpdated);
        
        if (newStatus === "Cash Withdrawn") {
          try {
            const otp = await generateOTP(orderId);
            if (otp) {
              toast.success("Verification PIN generated. The customer can now see it in their app.");
            }
          } catch (error: any) {
            console.error("Error auto-generating OTP:", error);
            toast.error("Failed to generate verification PIN. Please generate it manually.");
          }
        }
        
        await loadOrder();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error?.message || strings.errors.generic);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!orderId || otpValue.length !== 4) {
      toast.error(strings.errors.invalidPIN);
      return;
    }

    setUpdating(true);
    try {
      const result = await verifyOTP(orderId, otpValue);
      if (result.success) {
        if (result.requiresCountConfirmation) {
          // Counted mode: OTP verified, now show counting step
          setOtpVerified(true);
          setIsCountingStep(true);
          setCountdown(20);
          // Reload order to get updated otp_verified_at field
          await loadOrder();
        } else {
          // Speed mode: Complete immediately
          triggerConfetti(3000);
          toast.success("Delivery completed successfully!");
          await loadOrder();
          setTimeout(() => navigate("/runner/work"), 2000);
        }
      } else {
        toast.error(result.error || "Invalid PIN. Please try again.");
        setOtpValue("");
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast.error(error?.message || strings.errors.generic);
      setOtpValue("");
    } finally {
      setUpdating(false);
    }
  };


  const handleConfirmAllGood = async () => {
    if (!orderId || !order) return;

    // Validate order state before attempting completion
    if (order.status !== "Pending Handoff") {
      console.error('[handleConfirmAllGood] Order is not in Pending Handoff status:', {
        orderId,
        currentStatus: order.status,
        expectedStatus: "Pending Handoff"
      });
      toast.error("Order is not in the correct state. Please refresh and try again.");
      await loadOrder(); // Refresh to get latest state
      return;
    }

    // Use local otpVerified state instead of checking order object
    // The confirmCount function will verify with the database for data integrity
    if (!otpVerified) {
      console.error('[handleConfirmAllGood] OTP not verified (local state):', {
        orderId,
        otpVerified,
        orderStatus: order.status
      });
      toast.error("PIN must be verified before completing delivery. Please verify the PIN first.");
      // Try to reload order to sync state
      await loadOrder();
      return;
    }

    const deliveryStyle = resolveDeliveryStyleFromOrder(order);
    if (deliveryStyle !== 'COUNTED') {
      console.error('[handleConfirmAllGood] Not a counted delivery:', {
        orderId,
        deliveryStyle,
        expectedStyle: 'COUNTED'
      });
      toast.error("This action is only available for counted delivery style.");
      return;
    }

    try {
      setCompleting(true);
      console.log('[handleConfirmAllGood] Attempting to complete delivery:', {
        orderId,
        status: order.status,
        otpVerified,
        deliveryStyle,
        countdown
      });
      
      const result = await confirmCount(orderId);
      if (result.success) {
        triggerConfetti(3000);
        toast.success("Delivery completed successfully!");
        await loadOrder();
        setTimeout(() => navigate("/runner/work"), 2000);
      } else {
        console.error('[handleConfirmAllGood] confirmCount returned error:', result.error);
        toast.error(result.error || "Failed to complete delivery. Please try again.");
      }
    } catch (error: any) {
      console.error("[handleConfirmAllGood] Error completing delivery:", {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        orderId,
        orderStatus: order?.status
      });
      toast.error(error?.message || strings.errors.generic || "Failed to complete delivery. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handleReportProblem = async () => {
    if (!orderId || !order) return;

    try {
      setCompleting(true);
      const { createOrderIssue } = await import("@/db/api");
      await createOrderIssue({
        orderId: order.id,
        runnerId: order.runner_id || undefined,
        customerId: order.customer_id,
        category: 'CASH_AMOUNT',
        notes: 'Runner reported an issue at cash handoff (counted style).',
      });
      
      toast.success("We've flagged this delivery for Benjamin support. Stay polite and follow the training playbook.");
      
      // Stay on this screen but disable completion - order status will be updated by support
      setIsCountingStep(false);
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      toast.error(error?.message || "Failed to report issue. Please contact support.");
    } finally {
      setCompleting(false);
    }
  };

  // Countdown timer for count step (20 seconds)
  useEffect(() => {
    if (!isCountingStep || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountingStep, countdown]);

  // Legacy countdown for backward compatibility (remove once counting step refactor is complete)
  useEffect(() => {
    if (!countCooldownStart || countCooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - countCooldownStart.getTime()) / 1000);
      const remaining = Math.max(0, 20 - elapsed);
      setCountCooldownRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countCooldownStart, countCooldownRemaining]);

  const handleRateCustomer = async (rating: number) => {
    if (!orderId) return;
    try {
      setSubmittingCustomerRating(true);
      await rateCustomerByRunner(orderId, rating);
      toast.success("Rating submitted successfully");
      await loadOrder();
    } catch (e: any) {
      console.error("Error rating customer:", e);
      toast.error(e.message || "Failed to submit rating");
    } finally {
      setSubmittingCustomerRating(false);
    }
  };

  if (loading) {
    return (
      <RunnerSubpageLayout title="Order Details">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">{strings.emptyStates.loading}</div>
        </div>
      </RunnerSubpageLayout>
    );
  }

  if (!order) {
    return (
      <RunnerSubpageLayout title="Order Details">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-slate-400">Order not found</div>
          <Button onClick={() => navigate("/runner/work")} className="bg-indigo-600 text-white hover:bg-indigo-700">
            Back to Work
          </Button>
        </div>
      </RunnerSubpageLayout>
    );
  }

  const hasRatedCustomer = !!order.customer_rating_by_runner;
  const isCompleted = order.status === "Completed";
  
  // Format completed date
  const completedDate = order.handoff_completed_at 
    ? new Date(order.handoff_completed_at)
    : order.updated_at 
    ? new Date(order.updated_at)
    : null;
  const formattedCompletedAt = completedDate
    ? formatDate(completedDate, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'N/A';

  // Determine map locations based on order status using actual order data
  const getMapLocations = (): { origin: Location; destination: Location; title: string } | null => {
    const showCustomerRoute = ['Cash Withdrawn', 'Pending Handoff', 'Completed'].includes(order.status);
    
    console.log('[RunnerOrderDetail] getMapLocations - order.status:', order.status);
    console.log('[RunnerOrderDetail] showCustomerRoute:', showCustomerRoute);
    console.log('[RunnerOrderDetail] Order pickup fields:', {
      pickup_lat: (order as any).pickup_lat,
      pickup_lng: (order as any).pickup_lng,
      pickup_name: (order as any).pickup_name,
      pickup_address: (order as any).pickup_address,
    });
    console.log('[RunnerOrderDetail] Order address snapshot:', order.address_snapshot);
    
    // Get pickup location (ATM) from order
    // Prefer real ATM coordinates, fallback to Miami center if missing
    const hasPickup = !!(order as any).pickup_lat && !!(order as any).pickup_lng;
    
    const pickupLocation: Location | null = hasPickup
      ? {
          lat: (order as any).pickup_lat,
          lng: (order as any).pickup_lng,
          address: (order as any).pickup_address || (order as any).pickup_name || 'ATM Location',
        }
      : null;
    
    if (!hasPickup) {
      console.warn('[RUNNER_MAP] Order has no pickup_lat/lng, will use fallback destination', { 
        orderId: order.id,
        pickup_lat: (order as any).pickup_lat,
        pickup_lng: (order as any).pickup_lng,
        pickup_name: (order as any).pickup_name,
        pickup_address: (order as any).pickup_address,
      });
    }
    
    // Get dropoff location (customer delivery address) from order
    // Use custom pin coordinates if available (for exact meeting location), otherwise use original coordinates
    const addressSnapshot = order.address_snapshot as any;
    const dropoffLocation: Location | null = 
      (addressSnapshot?.custom_pin_lat && addressSnapshot?.custom_pin_lng)
        ? {
            lat: addressSnapshot.custom_pin_lat,
            lng: addressSnapshot.custom_pin_lng,
            address: order.address_snapshot?.line1 
              ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city}, ${order.address_snapshot.state}`
              : order.customer_address || 'Customer Address',
          }
        : (order.address_snapshot?.latitude && order.address_snapshot?.longitude)
        ? {
            lat: order.address_snapshot.latitude,
            lng: order.address_snapshot.longitude,
            address: order.address_snapshot.line1 
              ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city}, ${order.address_snapshot.state}`
              : order.customer_address || 'Customer Address',
          }
        : null;
    
    if (showCustomerRoute) {
      // After cash withdrawal: show route from ATM to customer
      if (pickupLocation && dropoffLocation) {
        const locations = {
          origin: pickupLocation,
          destination: dropoffLocation,
          title: 'Route to Customer',
        };
        console.log('[RunnerOrderDetail] Returning customer route locations:', locations);
        return locations;
      } else {
        console.warn('[RunnerOrderDetail] Missing pickup or dropoff location for customer route');
        return null;
      }
    } else if (order.status === 'Runner Accepted' || order.status === 'Runner at ATM') {
      // Before cash withdrawal: show route to ATM
      // Use fallback if pickup location is missing (map will still render)
      const FALLBACK_DESTINATION: Location = {
        lat: 25.7617, // Miami center
        lng: -80.1918,
        address: 'Miami, FL',
      };
      
      const destination = pickupLocation || FALLBACK_DESTINATION;
      
      if (!pickupLocation) {
        console.warn('[RunnerOrderDetail] ⚠️ Missing pickup location for ATM route, using fallback', {
          pickup_lat: (order as any).pickup_lat,
          pickup_lng: (order as any).pickup_lng,
          pickup_address: (order as any).pickup_address,
          orderId: order.id,
        });
        // Don't return null - use fallback so map still renders
      }
      
      // For origin, we'll use a default location (runner's current location would be ideal but requires GPS)
      // TODO: Replace with actual runner GPS location when available
      // For now, use Miami center as a fallback - the map will center on destination (ATM) anyway
      const defaultOrigin: Location = {
        lat: 25.7617, // Miami center as fallback (map centers on destination, so this is just for route calculation)
        lng: -80.1918,
        address: 'Current Location',
      };
      
      const locations = {
        origin: defaultOrigin, // TODO: Replace with actual runner GPS location when available
        destination: destination,
        title: 'Route to ATM',
      };
      
      console.log('[RunnerOrderDetail] ✅ Returning ATM route locations:', {
        origin: locations.origin,
        destination: locations.destination,
        destinationLat: locations.destination.lat,
        destinationLng: locations.destination.lng,
        destinationAddress: locations.destination.address,
        usingFallback: !pickupLocation,
      });
      return locations;
    }
    
    console.log('[RunnerOrderDetail] No map locations for status:', order.status);
    return null;
  };

  const mapLocations = getMapLocations();
  console.log('[RunnerOrderDetail] mapLocations:', mapLocations);

  return (
    <RunnerSubpageLayout 
      title={`Order #${shortId(order.id)}`}
      headerRight={<StatusChip status={order.status} tone="runner" />}
    >
      <div className="space-y-4">

        {/* Customer Rating Section - Near top for completed orders */}
        {isCompleted && (
          <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h2 className="text-sm font-medium text-white">
                  Rate this customer
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your rating helps keep Benjamin safe and fair.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <RatingStars
                size="md"
                value={order.customer_rating_by_runner ?? 0}
                readOnly={hasRatedCustomer || submittingCustomerRating}
                onChange={
                  hasRatedCustomer || submittingCustomerRating
                    ? undefined
                    : handleRateCustomer
                }
              />
            </div>
          </section>
        )}

        {/* Active Order Flow - Only show for non-completed orders */}
        {!isCompleted && (
          <>
            {/* STAGE 1: Runner Accepted - Show map to ATM only */}
            {order.status === "Runner Accepted" && (
              <>
                {/* Map to ATM */}
                {mapLocations && (
                  <section className="rounded-3xl bg-[#050816] border border-white/5 overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
                    <RunnerDirectionsMap
                      origin={mapLocations.origin}
                      destination={mapLocations.destination}
                      title={mapLocations.title}
                      height="400px"
                      originAvatarUrl={profile?.avatar_url}
                      destinationAvatarUrl={order?.customer?.avatar_url}
                    />
                  </section>
                )}

                {/* Action Card */}
                <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-sm font-medium text-white mb-2">Head towards the ATM</p>
                      {(order as any).pickup_address && (
                        <div className="mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">ATM Location</p>
                          <p className="text-sm font-medium text-white">{(order as any).pickup_address}</p>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mb-4">
                        Navigate to the ATM location. The exact cash amount and full delivery address will be revealed once you confirm you're at the ATM.
                      </p>
                      <Button
                        onClick={() => handleUpdateStatus("Runner at ATM")}
                        disabled={updating || !canConfirmAtATM(order.status)}
                        className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                      >
                        {updating ? "Updating..." : "Confirm I'm at the ATM"}
                      </Button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* STAGE 2: Runner at ATM - Show cash amount */}
            {order.status === "Runner at ATM" && (
              <>
                {/* Map to ATM (still showing) */}
                {mapLocations && (
                  <section className="rounded-3xl bg-[#050816] border border-white/5 overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
                    <RunnerDirectionsMap
                      origin={mapLocations.origin}
                      destination={mapLocations.destination}
                      title={mapLocations.title}
                      height="400px"
                      originAvatarUrl={profile?.avatar_url}
                      destinationAvatarUrl={order?.customer?.avatar_url}
                    />
                  </section>
                )}

                {/* Cash Amount Card */}
                <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-sm font-medium text-white mb-2">Withdraw Cash</p>
                      <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Amount to withdraw</p>
                        <p className="text-2xl font-bold text-white">${order.requested_amount.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Withdraw this amount using your Benjamin card. Once you've completed the withdrawal, confirm below.
                      </p>
                      <Button
                        onClick={() => handleUpdateStatus("Cash Withdrawn")}
                        disabled={updating}
                        className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                      >
                        {updating ? "Updating..." : "I've Withdrawn the Cash"}
                      </Button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* STAGE 3: Cash Withdrawn - OTP Auto-generated, map updates to customer */}
            {order.status === "Cash Withdrawn" && !order.otp_code && (
              <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm font-medium text-emerald-400 mb-2">Cash Secured</p>
                  <p className="text-xs text-slate-300 mb-4">
                    Great! The cash has been secured. Generating verification PIN...
                  </p>
                  <div className="text-center py-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                  </div>
                </div>
              </section>
            )}

            {/* STAGE 4: Pending Handoff - Map to customer, show address, arrival button */}
            {order.status === "Pending Handoff" && order.otp_code && (
              <>
                {/* Map to Customer */}
                {mapLocations && (
                  <section className="rounded-3xl bg-[#050816] border border-white/5 overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
                    <RunnerDirectionsMap
                      origin={mapLocations.origin}
                      destination={mapLocations.destination}
                      title={mapLocations.title}
                      height="400px"
                      originAvatarUrl={profile?.avatar_url}
                      destinationAvatarUrl={order?.customer?.avatar_url}
                    />
                  </section>
                )}

                {/* Customer Address & Action */}
                {!runnerArrived ? (
                  <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-xl">
                        <p className="text-sm font-medium text-white mb-2">Head to Customer</p>
                        <div className="p-3 bg-white/5 rounded-lg mb-4 border border-white/10">
                          <div className="flex items-start gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs text-slate-400 mb-1">Delivery address:</div>
                              <div className="text-sm font-medium text-white">{order.customer_address || 'Address not available'}</div>
                            </div>
                            
                            {/* Message Button - Available when en route to customer */}
                            {order.customer && (
                              <button
                                onClick={() => navigate(`/runner/chat/${order.id}`)}
                                className="relative w-10 h-10 rounded-full bg-[#4F46E5] text-white hover:bg-[#4338CA] flex items-center justify-center transition-colors shrink-0"
                                aria-label="Message customer"
                              >
                                <MessageCircle className="h-5 w-5" />
                                {unreadCount > 0 && (
                                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#050816]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Handoff Style Info */}
                        {(() => {
                          const deliveryStyle = resolveDeliveryStyleFromOrder(order);
                          const styleCopy = getDeliveryStyleCopy(deliveryStyle);
                          return (
                            <section className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                Handoff style
                              </div>
                              <div className="flex items-baseline justify-between mt-1">
                                <span className="text-sm font-semibold text-white">
                                  {styleCopy.label}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {getDeliveryStyleShortHint(deliveryStyle)}
                              </p>
                            </section>
                          );
                        })()}
                        
                        <Button
                          onClick={async () => {
                            if (!orderId) return;
                            setUpdating(true);
                            try {
                              const result = await markRunnerArrived(orderId);
                              if (result.success) {
                                setRunnerArrived(true);
                                toast.success("Arrival confirmed. Customer has been notified.");
                                await loadOrder();
                              } else {
                                toast.error(result.error || "Failed to mark arrival");
                              }
                            } catch (error: any) {
                              console.error("Error marking arrival:", error);
                              toast.error(error?.message || "Failed to mark arrival");
                            } finally {
                              setUpdating(false);
                            }
                          }}
                          disabled={updating}
                          className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                        >
                          {updating ? "Updating..." : "I've Arrived at the Location"}
                        </Button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-sm font-medium text-emerald-400 mb-2">Arrival Confirmed</p>
                      <p className="text-xs text-slate-300">
                        Customer has been notified. Please wait for them to provide the verification PIN.
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* STAGE 5: At Arrival - OTP Verification */}
            {order.status === "Pending Handoff" && order.otp_code && runnerArrived && !otpVerified && !isCountingStep && (
              <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4 space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm font-medium text-white mb-2">Verify Delivery</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Enter the 6-digit code from the customer to complete the delivery.
                    </p>
                    
                    {/* Delivery Style Instructions */}
                    {(() => {
                      const deliveryStyle = resolveDeliveryStyleFromOrder(order);
                      return (
                        <div className="mb-4 rounded-xl bg-slate-800/50 border border-slate-700/50 px-3 py-3">
                          <p className="text-xs font-medium text-white mb-1">
                            How this customer wants their cash
                          </p>
                          <p className="text-xs text-slate-300 whitespace-pre-line">
                            {getArrivalInstruction(deliveryStyle)}
                          </p>
                        </div>
                      );
                    })()}
                    {order.customer && (() => {
                      // When runner has arrived, show full name and avatar for recognition
                      const customer = order.customer as any;
                      const firstName = customer?.first_name || '';
                      const lastName = customer?.last_name || '';
                      const fullName = lastName 
                        ? `${firstName} ${lastName}`.trim()
                        : firstName || 'Customer';
                      const avatarUrl = customer?.avatar_url || null;
                      
                      return (
                        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <div className="text-xs text-emerald-400 mb-2 font-medium">Customer for delivery</div>
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={avatarUrl || undefined}
                              fallback={fullName}
                              size="lg"
                            />
                            <div className="flex-1">
                              <div className="text-base font-semibold text-white">{fullName}</div>
                              <div className="text-xs text-slate-400 mt-0.5">Ask for the verification PIN</div>
                            </div>
                            
                            {/* Message Button - Circular with Chat Icon (Runner App Style) */}
                            {((order.status === "Cash Withdrawn" as OrderStatus) || (order.status === "Pending Handoff" as OrderStatus)) && (
                              <button
                                onClick={() => navigate(`/runner/chat/${order.id}`)}
                                className="relative w-10 h-10 rounded-full bg-[#4F46E5] text-white hover:bg-[#4338CA] flex items-center justify-center transition-colors shrink-0"
                                aria-label="Message customer"
                              >
                                <MessageCircle className="h-5 w-5" />
                                {unreadCount > 0 && (
                                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#050816]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Delivery Style Chip - Above OTP Input */}
                    {(() => {
                      const deliveryStyle = resolveDeliveryStyleFromOrder(order);
                      const chipLabel = getDeliveryStyleChipLabel(deliveryStyle);
                      return (
                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-[11px] text-slate-100">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{chipLabel}</span>
                        </div>
                      );
                    })()}
                    
                    <div className="flex justify-center mb-4 [&_[data-slot='input-otp-slot']]:bg-white/5 [&_[data-slot='input-otp-slot']]:border-white/20 [&_[data-slot='input-otp-slot']]:text-white [&_[data-slot='input-otp-slot'][data-active='true']]:bg-white/10 [&_[data-slot='input-otp-slot'][data-active='true']]:border-[#4F46E5] [&_[data-slot='input-otp-slot'][data-active='true']]:ring-[#4F46E5]/50 [&_[data-slot='input-otp-slot'][data-active='true']]:ring-[3px]">
                      <InputOTP
                        value={otpValue}
                        onChange={setOtpValue}
                        maxLength={4}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={updating || otpValue.length !== 4}
                      className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {updating 
                        ? "Verifying..." 
                        : resolveDeliveryStyleFromOrder(order) === 'COUNTED'
                        ? "Verify PIN"
                        : "Verify and Complete Delivery"}
                    </Button>
                    
                    {/* OTP Footer Text - Delivery Style Reminder */}
                    {(() => {
                      const deliveryStyle = resolveDeliveryStyleFromOrder(order);
                      return (
                        <p className="mt-2 text-[11px] text-slate-400 text-center">
                          {getOtpFooterText(deliveryStyle)}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </section>
            )}

            {/* STAGE 6: Counting Step (Counted Mode Only) */}
            {order.status === "Pending Handoff" && isCountingStep && resolveDeliveryStyleFromOrder(order) === 'COUNTED' && (
              <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-8">
                <div className="flex flex-col items-center justify-center text-center gap-6">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-white">Let them count it</h2>
                    <p className="text-sm text-slate-400">
                      Stay with your customer while they count their cash. 
                      Don't rush them — this protects both of you.
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 rounded-full border-4 border-emerald-400/40 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-emerald-400">
                        {countdown}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Offer them up to 20 seconds to count the cash.
                    </p>
                  </div>
                  
                  <div className="w-full space-y-3">
                    <Button
                      className="w-full h-11 rounded-full bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={countdown > 0 || completing || !order || order.status !== "Pending Handoff" || !otpVerified}
                      onClick={handleConfirmAllGood}
                    >
                      {countdown > 0 ? 'Waiting…' : 'All good, complete delivery'}
                    </Button>
                    <button
                      type="button"
                      className="w-full text-xs text-slate-500 hover:text-slate-400 transition-colors"
                      onClick={handleReportProblem}
                      disabled={completing}
                    >
                      Something's not right
                    </button>
                  </div>
                </div>
              </section>
            )}

          </>
        )}

        {/* Completed Order View - Simplified Timeline */}
        {isCompleted && (
          <>
            {/* Delivery Progress Timeline - Simplified for completed */}
            <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
              <h3 className="text-sm font-medium text-white mb-3">Delivery Progress</h3>
              <div className="space-y-3">
                {/* Ordered */}
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">Ordered</div>
                    <div className="text-xs text-slate-400">
                      {formatDate(new Date(order.created_at), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Accepted */}
                {order.runner_accepted_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">Accepted</div>
                      <div className="text-xs text-slate-400">
                        {formatDate(new Date(order.runner_accepted_at), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Withdrawn */}
                {order.cash_withdrawn_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">Cash Withdrawn</div>
                      <div className="text-xs text-slate-400">
                        {formatDate(new Date(order.cash_withdrawn_at), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivered */}
                {completedDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">Delivered</div>
                      <div className="text-xs text-slate-400">
                        {formattedCompletedAt}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Chat Closed Message */}
            <div className="mt-4 text-xs text-slate-500 text-center px-4">
              This chat is closed for this delivery. For help, contact Benjamin Support.
            </div>
          </>
        )}
      </div>
    </RunnerSubpageLayout>
  );
}
