import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign, User, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOrderById, subscribeToOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";

const statusColors: Record<OrderStatus, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Runner Accepted": "bg-accent text-accent-foreground",
  "Runner at ATM": "bg-accent text-accent-foreground",
  "Cash Withdrawn": "bg-accent text-accent-foreground",
  "Pending Handoff": "bg-accent text-accent-foreground",
  "Completed": "bg-success text-success-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground"
};

const statusIcons: Record<OrderStatus, any> = {
  "Pending": Clock,
  "Runner Accepted": CheckCircle2,
  "Runner at ATM": MapPin,
  "Cash Withdrawn": DollarSign,
  "Pending Handoff": AlertCircle,
  "Completed": CheckCircle2,
  "Cancelled": XCircle
};

export default function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The order #{orderId?.slice(0, 8)} could not be found in the system.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/orders")}>
            Back to Order Monitoring
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/orders")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Order Monitoring
      </Button>

      <div className="space-y-6">
        {/* Order Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Order #{order.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  Created {new Date(order.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <Badge className={statusColors[order.status]}>
                <StatusIcon className="mr-2 h-4 w-4" />
                {order.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
            <CardDescription>Track the progress of this delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TimelineItem
                title="Order Created"
                timestamp={order.created_at}
                completed={true}
              />
              <TimelineItem
                title="Runner Accepted"
                timestamp={order.runner_accepted_at}
                completed={!!order.runner_accepted_at}
              />
              <TimelineItem
                title="Runner at ATM"
                timestamp={order.runner_at_atm_at}
                completed={!!order.runner_at_atm_at}
              />
              <TimelineItem
                title="Cash Withdrawn"
                timestamp={order.cash_withdrawn_at}
                completed={!!order.cash_withdrawn_at}
              />
              <TimelineItem
                title="Delivery Completed"
                timestamp={order.handoff_completed_at}
                completed={!!order.handoff_completed_at}
              />
              {order.cancelled_at && (
                <TimelineItem
                  title="Order Cancelled"
                  timestamp={order.cancelled_at}
                  completed={true}
                  cancelled={true}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Name</div>
                <div className="font-medium">{order.customer_name || 'Not provided'}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Email</div>
                <div className="font-medium">{order.customer?.email || 'N/A'}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Phone</div>
                <div className="font-medium">{order.customer?.phone || 'Not provided'}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Delivery Address</div>
                <div className="font-medium flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <span>{order.customer_address || 'Not provided'}</span>
                </div>
              </div>
              {order.customer_notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Delivery Notes</div>
                    <div className="font-medium bg-muted p-3 rounded-md text-sm">
                      {order.customer_notes}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Runner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Runner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.runner ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Name</div>
                    <div className="font-medium">
                      {order.runner.first_name} {order.runner.last_name}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Email</div>
                    <div className="font-medium">{order.runner.email}</div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Phone</div>
                    <div className="font-medium">{order.runner.phone || 'Not provided'}</div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Accepted At</div>
                    <div className="font-medium">
                      {order.runner_accepted_at 
                        ? new Date(order.runner_accepted_at).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Runner Assigned</AlertTitle>
                  <AlertDescription>
                    This order is waiting for a runner to accept it.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Requested Amount</span>
                <span className="font-semibold text-lg">${order.requested_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Platform Fee</span>
                <span className="text-sm">${order.profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Compliance Fee</span>
                <span className="text-sm">${order.compliance_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Delivery Fee (Runner Earnings)</span>
                <span className="text-sm font-medium text-success">${order.delivery_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Total Service Fee</span>
                <span className="font-semibold">${order.total_service_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary text-primary-foreground rounded-lg px-4 mt-4">
                <span className="font-bold">Total Payment</span>
                <span className="text-2xl font-bold">${order.total_payment.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        {order.status === "Pending Handoff" && (
          <Card>
            <CardHeader>
              <CardTitle>Security Information</CardTitle>
              <CardDescription>OTP verification details</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>OTP Active</AlertTitle>
                <AlertDescription>
                  A 6-digit OTP has been generated for secure delivery verification.
                  {order.otp_expires_at && (
                    <div className="mt-2 text-sm">
                      Expires: {new Date(order.otp_expires_at).toLocaleString()}
                    </div>
                  )}
                  <div className="mt-1 text-sm">
                    Attempts used: {order.otp_attempts} / 3
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Cancellation Information */}
        {order.status === "Cancelled" && order.cancellation_reason && (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Cancellation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Order Cancelled</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <strong>Reason:</strong> {order.cancellation_reason}
                  </div>
                  <div className="mt-1 text-sm">
                    Cancelled at: {order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : 'N/A'}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface TimelineItemProps {
  title: string;
  timestamp: string | null;
  completed: boolean;
  cancelled?: boolean;
}

function TimelineItem({ title, timestamp, completed, cancelled = false }: TimelineItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        cancelled 
          ? 'bg-destructive text-destructive-foreground' 
          : completed 
            ? 'bg-success text-success-foreground' 
            : 'bg-muted text-muted-foreground'
      }`}>
        {cancelled ? (
          <XCircle className="h-4 w-4" />
        ) : completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">
          {timestamp ? new Date(timestamp).toLocaleString() : 'Pending'}
        </div>
      </div>
    </div>
  );
}
