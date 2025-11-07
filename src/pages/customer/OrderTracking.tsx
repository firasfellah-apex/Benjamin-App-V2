import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getOrderById, subscribeToOrder, cancelOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { RunnerIdentity } from "@/components/order/RunnerIdentity";
import { CustomerOrderMap } from "@/components/order/CustomerOrderMap";
import { SafetyBanner } from "@/components/common/SafetyBanner";
import { Chip } from "@/components/common/Chip";
import { triggerConfetti } from "@/lib/confetti";
import { canRevealRunner } from "@/lib/reveal";
import { strings } from "@/lib/strings";

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<OrderStatus | null>(null);

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
  const showRunnerInfo = canRevealRunner(order.status);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/customer/orders")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {strings.customer.trackingBackButton}
      </Button>

      <div className="space-y-6">
        {/* Safety Banner - shown before runner reveal */}
        {!showRunnerInfo && order.runner_id && (
          <SafetyBanner
            message={strings.helpers.safetyBanner}
            storageKey="benjamin-safety-banner-dismissed"
          />
        )}

        {/* Order Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  Created {new Date(order.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <Chip status={order.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{strings.customer.cashAmount}</span>
                </div>
                <div className="text-2xl font-bold">${order.requested_amount.toFixed(2)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{strings.customer.totalPayment}</span>
                </div>
                <div className="text-2xl font-bold">${order.total_payment.toFixed(2)}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {strings.customer.deliveryAddress}
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                {order.customer_address}
              </div>
            </div>

            {/* Runner Identity with Safe Reveal */}
            {order.runner && (
              <>
                <Separator />
                <RunnerIdentity
                  runnerName={`${order.runner.first_name} ${order.runner.last_name}`}
                  runnerAvatarUrl={order.runner.avatar_url}
                  orderStatus={order.status}
                  size="md"
                  showLabel={true}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{strings.customer.deliveryProgress}</CardTitle>
            <CardDescription>{strings.customer.deliveryProgressDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderTimeline
              currentStatus={order.status}
              timestamps={{
                'Pending': order.created_at,
                'Runner Accepted': order.runner_accepted_at || undefined,
                'Runner at ATM': order.runner_at_atm_at || undefined,
                'Cash Withdrawn': order.cash_withdrawn_at || undefined,
                'Pending Handoff': order.handoff_completed_at || undefined,
                'Completed': order.status === 'Completed' ? order.updated_at : undefined
              }}
            />
          </CardContent>
        </Card>

        {/* Map Component */}
        {order.customer_address && (
          <CustomerOrderMap
            orderStatus={order.status}
            customerLocation={{
              lat: 40.7128,
              lng: -74.0060,
              address: order.customer_address
            }}
            estimatedArrival="5 minutes"
          />
        )}

        {order.status === "Pending Handoff" && order.otp_code && (
          <Card>
            <CardHeader>
              <CardTitle>{strings.customer.otpTitle}</CardTitle>
              <CardDescription>
                {strings.customer.otpPrompt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <InputOTP value={order.otp_code} maxLength={6} disabled>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </CardContent>
          </Card>
        )}

        {canCancel && (
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                onClick={handleCancel}
                className="w-full"
              >
                {strings.customer.cancelButton}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
