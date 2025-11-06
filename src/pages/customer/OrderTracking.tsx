import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, MapPin, User, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getOrderById, subscribeToOrder, cancelOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const statusSteps: OrderStatus[] = [
  "Pending",
  "Runner Accepted",
  "Runner at ATM",
  "Cash Withdrawn",
  "Pending Handoff",
  "Completed"
];

const statusColors: Record<OrderStatus, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Runner Accepted": "bg-accent text-accent-foreground",
  "Runner at ATM": "bg-accent text-accent-foreground",
  "Cash Withdrawn": "bg-accent text-accent-foreground",
  "Pending Handoff": "bg-accent text-accent-foreground",
  "Completed": "bg-success text-success-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground"
};

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      const data = await getOrderById(orderId);
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
  }, [orderId]);

  const handleCancel = async () => {
    if (!orderId || !order) return;

    if (order.status === "Runner at ATM" || order.status === "Cash Withdrawn" || order.status === "Pending Handoff") {
      toast.error("Cannot cancel order at this stage");
      return;
    }

    try {
      const success = await cancelOrder(orderId, "Cancelled by customer");
      if (success) {
        toast.success("Order cancelled successfully");
      }
    } catch (error) {
      toast.error("Failed to cancel order");
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
          <Button onClick={() => navigate("/customer/orders")}>
            View All Orders
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);
  const canCancel = order.status === "Pending" || order.status === "Runner Accepted";

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/customer/orders")}
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
                  Created {new Date(order.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <Badge className={statusColors[order.status]}>
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Cash Amount</span>
                </div>
                <div className="text-2xl font-bold">${order.requested_amount.toFixed(2)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Payment</span>
                </div>
                <div className="text-2xl font-bold">${order.total_payment.toFixed(2)}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                {order.customer_address}
              </div>
            </div>

            {order.runner && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Runner
                  </div>
                  <div className="text-sm text-muted-foreground pl-6">
                    {order.runner.first_name} {order.runner.last_name}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Progress</CardTitle>
            <CardDescription>Track your cash delivery in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusSteps.map((status, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                return (
                  <div key={status} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          isCompleted
                            ? "border-success bg-success text-success-foreground"
                            : isCurrent
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-muted bg-background text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`h-12 w-0.5 ${
                            isCompleted ? "bg-success" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className={`font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                        {status}
                      </div>
                      {isCompleted && (
                        <div className="text-sm text-muted-foreground">
                          Completed
                        </div>
                      )}
                      {isCurrent && (
                        <div className="text-sm text-accent">
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {order.status === "Pending Handoff" && order.otp_code && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Code</CardTitle>
              <CardDescription>
                Share this code with the runner to complete delivery
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
              <p className="text-sm text-muted-foreground text-center mt-4">
                Code expires in 10 minutes
              </p>
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
                Cancel Order
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
