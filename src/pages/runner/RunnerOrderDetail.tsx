import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { getOrderById, updateOrderStatus, generateOTP, verifyOTP, subscribeToOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { Chip } from "@/components/common/Chip";
import { Avatar } from "@/components/common/Avatar";
import { OrderProgressTimeline } from "@/components/order/OrderProgressTimeline";
import { RunnerOrderMap } from "@/components/order/RunnerOrderMap";
import { triggerConfetti } from "@/lib/confetti";
import { strings } from "@/lib/strings";

export default function RunnerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!orderId) return;

    loadOrder();

    const subscription = subscribeToOrder(orderId, (payload) => {
      if (payload.eventType === "UPDATE") {
        loadOrder();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderId) return;

    setUpdating(true);
    try {
      const success = await updateOrderStatus(orderId, newStatus as any);
      if (success) {
        toast.success(strings.toasts.statusUpdated);
        // Immediately reload order data for instant UI update
        await loadOrder();
      }
    } catch (error) {
      toast.error(strings.errors.generic);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateOTP = async () => {
    if (!orderId) return;

    setUpdating(true);
    try {
      const otp = await generateOTP(orderId);
      if (otp) {
        toast.success(strings.toasts.otpGenerated);
        // Immediately reload order data for instant UI update
        await loadOrder();
      }
    } catch (error) {
      toast.error(strings.errors.generic);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!orderId || otpValue.length !== 6) {
      toast.error(strings.errors.invalidOTP);
      return;
    }

    setUpdating(true);
    try {
      const success = await verifyOTP(orderId, otpValue);
      if (success) {
        triggerConfetti(3000);
        toast.success(strings.toasts.runnerCompleted);
        setTimeout(() => navigate("/runner/orders"), 2000);
      } else {
        toast.error(strings.errors.invalidOTP);
        setOtpValue("");
      }
    } catch (error) {
      toast.error(strings.errors.generic);
    } finally {
      setUpdating(false);
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
          <Button onClick={() => navigate("/runner/orders")}>
            {strings.runner.backToOrders}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/runner/orders")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {strings.runner.backToOrders}
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  Accepted {order.runner_accepted_at ? new Date(order.runner_accepted_at).toLocaleString() : 'Just now'}
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
                  <span>{strings.runner.cashToWithdraw}</span>
                </div>
                <div className="text-3xl font-bold">${order.requested_amount.toFixed(2)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{strings.runner.yourEarnings}</span>
                </div>
                <div className="text-3xl font-bold text-success">${order.delivery_fee.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {strings.customer.deliveryAddress}
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                {order.customer_address}
              </div>
              
              {/* Customer Info with Avatar */}
              {order.customer && (
                <div className="flex items-center gap-3 pl-6 mt-3">
                  <Avatar
                    src={order.customer.avatar_url}
                    fallback={order.customer_name || 'Customer'}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {strings.runner.customer}: {order.customer_name}
                    </div>
                  </div>
                </div>
              )}
              
              {order.customer_notes && (
                <div className="pl-6 mt-3">
                  <div className="text-sm font-medium mb-1">{strings.runner.deliveryNotes}:</div>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {order.customer_notes}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{strings.runner.deliveryProgress}</CardTitle>
            <CardDescription>{strings.runner.deliveryProgressDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderProgressTimeline
              currentStatus={order.status}
              variant="internal"
            />
          </CardContent>
        </Card>

        {/* Map Component */}
        {order.customer_address && (
          <RunnerOrderMap
            orderStatus={order.status}
            customerLocation={{
              lat: 40.7128,
              lng: -74.0060,
              address: order.customer_address
            }}
            atmLocation={{
              lat: 40.7580,
              lng: -73.9855,
              address: 'ATM at 123 Main St'
            }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>{strings.runner.deliverySteps}</CardTitle>
            <CardDescription>{strings.runner.deliveryStepsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.status === "Runner Accepted" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">{strings.runner.step1Title}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {strings.runner.step1Desc} ${order.requested_amount.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => handleUpdateStatus("Runner at ATM")}
                    disabled={updating}
                    className="w-full"
                  >
                    {strings.runner.step1Button}
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Runner at ATM" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">{strings.runner.step2Title}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {strings.runner.step2Desc} ${order.requested_amount.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => handleGenerateOTP()}
                    disabled={updating}
                    className="w-full"
                  >
                    {strings.runner.step2Button}
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Pending Handoff" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">{strings.runner.step3Title}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {strings.runner.step3Desc}
                  </p>
                  <div className="flex justify-center mb-4">
                    <InputOTP
                      value={otpValue}
                      onChange={setOtpValue}
                      maxLength={6}
                    >
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
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={updating || otpValue.length !== 6}
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {strings.runner.step3Button}
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Completed" && (
              <div className="p-4 bg-success/10 border border-success rounded-lg">
                <div className="flex items-center gap-2 text-success mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">{strings.runner.completedTitle}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {strings.runner.completedDesc} ${order.delivery_fee.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
