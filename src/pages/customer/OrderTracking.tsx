import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign, MessageCircle, Phone, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrderById, subscribeToOrder, cancelOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { OrderProgressTimeline } from "@/components/order/OrderProgressTimeline";
import { CustomerOrderMap } from "@/components/order/CustomerOrderMap";
import { Avatar } from "@/components/common/Avatar";
import { triggerConfetti } from "@/lib/confetti";
import { canShowLiveLocation, canRevealRunnerIdentity, canContactRunner, getRevealMessage, isOrderFinal } from "@/lib/reveal";
import { getCustomerFacingStatus } from "@/lib/customerStatus";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<OrderStatus | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      const data = await getOrderById(orderId);
      
      // Trigger confetti on completion
      if (data && previousStatus && previousStatus !== "Completed" && data.status === "Completed") {
        triggerConfetti(3000);
        toast.success(strings.toasts.otpVerified);
      }
      
      if (data) {
        setPreviousStatus(data.status);
      }
      
      setOrder(data);
      setLoading(false);
    };

    loadOrder();

    const subscription = subscribeToOrder(orderId, (payload) => {
      if (payload.eventType === "UPDATE") {
        loadOrder();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, previousStatus]);

  const handleCancel = async () => {
    if (!orderId || !order) return;

    if (order.status === "Runner at ATM" || order.status === "Cash Withdrawn" || order.status === "Pending Handoff") {
      toast.error("Cannot cancel order at this stage");
      return;
    }

    try {
      const success = await cancelOrder(orderId, "Cancelled by customer");
      if (success) {
        toast.success(strings.toasts.orderCanceled);
      }
    } catch (error) {
      toast.error(strings.errors.generic);
    }
  };

  const handleMessageRunner = () => {
    // TODO: Integrate in-app chat or SMS relay
    toast.info("Messaging feature coming soon");
  };

  const handleCallRunner = () => {
    // TODO: Integrate masked calling or tel: link
    toast.info("Calling feature coming soon");
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{strings.emptyStates.loading}</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-muted-foreground">{strings.errors.orderNotFound}</div>
          <Button onClick={() => navigate("/customer/orders")}>
            {strings.customer.trackingBackButton}
          </Button>
        </div>
      </div>
    );
  }

  const canCancel = order.status === "Pending" || order.status === "Runner Accepted";
  const showLiveMap = canShowLiveLocation(order.status);
  const showRunnerIdentity = canRevealRunnerIdentity(order.status);
  const allowContact = canContactRunner(order.status);
  const customerStatus = getCustomerFacingStatus(order.status);
  const isFinal = isOrderFinal(order.status);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-neutral-50">
      {/* Back Button - Fixed Top Left */}
      <div className="absolute top-4 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/customer/orders")}
          className="bg-white/95 backdrop-blur shadow-lg border-black/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Map Background - Full Screen */}
      <div className="absolute inset-0 z-0">
        <CustomerOrderMap
          orderStatus={order.status}
          customerLocation={{
            lat: 40.7128,
            lng: -74.0060,
            address: order.customer_address || ''
          }}
          estimatedArrival={showLiveMap ? "5 minutes" : undefined}
          className="h-full"
        />
      </div>

      {/* Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 z-10 pointer-events-none" />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out",
          sheetExpanded ? "h-[85vh]" : "h-auto max-h-[50vh]"
        )}
      >
        {/* Grab Handle */}
        <button
          onClick={() => setSheetExpanded(v => !v)}
          className="w-full py-3 flex justify-center items-center cursor-pointer hover:bg-neutral-50 rounded-t-3xl transition-colors"
          aria-label={sheetExpanded ? "Collapse details" : "Expand details"}
        >
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </button>

        {/* Sheet Content */}
        <div className={cn(
          "px-6 pb-6 overflow-y-auto",
          sheetExpanded ? "h-[calc(85vh-3rem)]" : "max-h-[45vh]"
        )}>
          {/* Collapsed Summary */}
          <div className="space-y-4">
            {/* Status Line */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">{customerStatus.label}</h2>
                <button
                  onClick={() => setSheetExpanded(v => !v)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  {sheetExpanded ? (
                    <ChevronDown className="h-5 w-5 text-neutral-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-neutral-600" />
                  )}
                </button>
              </div>
              <p className="text-sm text-neutral-600">{customerStatus.description}</p>
            </div>

            {/* Mini Progress Dots (Collapsed State Only) */}
            {!sheetExpanded && (
              <div className="flex items-center gap-2">
                {['Request received', 'Runner assigned', 'Preparing cash', 'On the way', 'Arrived', 'Completed'].map((step, idx) => {
                  const stepStatus = idx < ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff', 'Completed'].indexOf(order.status) + 1 ? 'completed' : idx === ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff', 'Completed'].indexOf(order.status) ? 'current' : 'future';
                  
                  return (
                    <div
                      key={step}
                      className={cn(
                        "h-2 flex-1 rounded-full transition-all",
                        stepStatus === 'completed' && "bg-black",
                        stepStatus === 'current' && "bg-black/50",
                        stepStatus === 'future' && "bg-neutral-200"
                      )}
                    />
                  );
                })}
              </div>
            )}

            {/* Runner Identity (Gated) */}
            {showRunnerIdentity && order.runner && (
              <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl">
                <Avatar
                  src={order.runner.avatar_url}
                  alt={order.runner.first_name || 'Runner'}
                  size="md"
                  className={cn(
                    "transition-all duration-300",
                    !showLiveMap && "blur-sm"
                  )}
                />
                <div className="flex-1">
                  <p className="font-medium text-black">
                    {showLiveMap 
                      ? `${order.runner.first_name} ${order.runner.last_name || ''}`
                      : order.runner.first_name
                    }
                  </p>
                  <p className="text-xs text-neutral-500">Your Benjamin runner</p>
                </div>
              </div>
            )}

            {/* Contact Buttons (Only if allowContact) */}
            {allowContact && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleMessageRunner}
                  className="flex-1 h-10 rounded-full border-neutral-200 text-black hover:bg-neutral-50"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button
                  onClick={handleCallRunner}
                  className="flex-1 h-10 rounded-full bg-black text-white hover:bg-black/90"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>
            )}

            {/* Safety Note (Before Contact Allowed) */}
            {!allowContact && !isFinal && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-900">
                  {getRevealMessage(order.status)}
                </p>
              </div>
            )}

            {/* OTP Display (Pending Handoff) */}
            {order.status === "Pending Handoff" && order.otp_code && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                <p className="text-sm font-medium text-green-900">Your Verification Code</p>
                <div className="flex justify-center gap-2">
                  {order.otp_code.split('').map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-12 flex items-center justify-center bg-white border-2 border-green-300 rounded-lg text-xl font-bold text-green-900"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 text-center">
                  Share this code with your runner to complete delivery
                </p>
              </div>
            )}
          </div>

          {/* Expanded Content: Full Timeline + Details */}
          {sheetExpanded && (
            <div className="mt-6 space-y-6 border-t border-neutral-200 pt-6">
              {/* Order Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-900">Order Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500">Cash Amount</p>
                    <p className="text-lg font-bold text-black">${order.requested_amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500">Total Payment</p>
                    <p className="text-lg font-bold text-black">${order.total_payment.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <p className="text-sm text-neutral-600 pl-6">
                  {order.customer_address || 'Address not available'}
                </p>
              </div>

              {/* Full Timeline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-900">Delivery Progress</h3>
                <OrderProgressTimeline
                  currentStatus={order.status}
                  variant="customer"
                  tone="customer"
                />
              </div>

              {/* Cancel Button */}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="w-full rounded-full"
                >
                  Cancel Order
                </Button>
              )}

              {/* Order ID Footer */}
              <div className="text-center pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-400">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
