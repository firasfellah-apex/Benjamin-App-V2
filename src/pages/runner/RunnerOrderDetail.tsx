import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { getOrderById, updateOrderStatus, generateOTP, verifyOTP, subscribeToOrder } from "@/db/api";
import type { OrderWithDetails } from "@/types/types";

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
        toast.success(`Status updated to ${newStatus}`);
      }
    } catch (error) {
      toast.error("Failed to update status");
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
        toast.success("OTP generated and sent to customer");
      }
    } catch (error) {
      toast.error("Failed to generate OTP");
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!orderId || otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setUpdating(true);
    try {
      const success = await verifyOTP(orderId, otpValue);
      if (success) {
        toast.success("Delivery completed successfully!");
        navigate("/runner/orders");
      } else {
        toast.error("Invalid or expired OTP code");
        setOtpValue("");
      }
    } catch (error) {
      toast.error("Failed to verify OTP");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-muted-foreground">Order not found</div>
          <Button onClick={() => navigate("/runner/orders")}>
            View My Orders
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
        Back to Orders
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
              <Badge className="bg-accent text-accent-foreground">
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Cash to Withdraw</span>
                </div>
                <div className="text-3xl font-bold">${order.requested_amount.toFixed(2)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Your Earnings</span>
                </div>
                <div className="text-3xl font-bold text-success">${order.delivery_fee.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                {order.customer_address}
              </div>
              <div className="text-sm font-medium pl-6">
                Customer: {order.customer_name}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Steps</CardTitle>
            <CardDescription>Follow these steps to complete the delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.status === "Runner Accepted" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Step 1: Go to ATM</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Head to the nearest ATM to withdraw ${order.requested_amount.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => handleUpdateStatus("Runner at ATM")}
                    disabled={updating}
                    className="w-full"
                  >
                    I've Arrived at ATM
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Runner at ATM" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Step 2: Withdraw Cash</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Withdraw ${order.requested_amount.toFixed(2)} from the ATM
                  </p>
                  <Button
                    onClick={() => handleGenerateOTP()}
                    disabled={updating}
                    className="w-full"
                  >
                    Cash Withdrawn - Generate OTP
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Pending Handoff" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Step 3: Complete Delivery</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Meet the customer and ask for their 6-digit verification code
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
                    Verify & Complete Delivery
                  </Button>
                </div>
              </div>
            )}

            {order.status === "Completed" && (
              <div className="p-4 bg-success/10 border border-success rounded-lg">
                <div className="flex items-center gap-2 text-success mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">Delivery Completed!</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  You earned ${order.delivery_fee.toFixed(2)} from this delivery
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
