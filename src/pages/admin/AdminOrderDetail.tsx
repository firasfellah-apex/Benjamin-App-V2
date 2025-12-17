import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, DollarSign, User, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getOrderById, subscribeToOrder, cancelOrder } from "@/db/api";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { OrderChatThread } from "@/components/chat/OrderChatThread";
import { MessageSquare } from "lucide-react";
import { RatingStars } from "@/components/common/RatingStars";

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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    setOrder(data);
    setLoading(false);
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;

    if (!cancellationReason) {
      toast.error("Please select a cancellation reason");
      return;
    }

    if (cancellationReason === "Other" && !customReason.trim()) {
      toast.error("Please provide a custom reason");
      return;
    }

    const finalReason = cancellationReason === "Other" ? customReason : cancellationReason;

    setCancelling(true);
    const result = await cancelOrder(orderId, finalReason);
    setCancelling(false);

    if (result.success) {
      toast.success(result.message);
      setShowCancelDialog(false);
      setCancellationReason("");
      setCustomReason("");
      loadOrder();
    } else {
      toast.error(result.message);
    }
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
      <div className="w-full max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
    <div className="w-full max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
                  Created {new Date(order.created_at).toLocaleString('en-US')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusColors[order.status]}>
                  <StatusIcon className="mr-2 h-4 w-4" />
                  {order.status}
                </Badge>
                {order.status !== 'Cancelled' && order.status !== 'Completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order
                  </Button>
                )}
              </div>
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
                        ? new Date(order.runner_accepted_at).toLocaleString('en-US')
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

        {/* Security Information - OTP Metadata (Admin God View) */}
        {order.otp_code && (
          <Card>
            <CardHeader>
              <CardTitle>PIN Verification Details</CardTitle>
              <CardDescription>Complete PIN metadata for support and dispute resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Verification PIN (Support Only)</div>
                  <div className="font-mono text-lg font-bold p-2 bg-muted rounded-md">
                    {order.otp_code}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Generated At</div>
                    <div className="text-sm font-medium">
                      {order.otp_expires_at 
                        ? new Date(order.cash_withdrawn_at || order.updated_at).toLocaleString('en-US')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expires At</div>
                    <div className="text-sm font-medium">
                      {order.otp_expires_at 
                        ? new Date(order.otp_expires_at).toLocaleString('en-US')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Verified At</div>
                    <div className="text-sm font-medium">
                      {(order as any).otp_verified_at
                        ? new Date((order as any).otp_verified_at).toLocaleString('en-US')
                        : order.status === 'Completed'
                        ? 'Verified (completed)'
                        : 'Not verified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Attempts</div>
                    <div className="text-sm font-medium">
                      {order.otp_attempts || 0} / 3
                    </div>
                  </div>
                </div>
                {order.status === "Pending Handoff" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>PIN Active</AlertTitle>
                    <AlertDescription>
                      Customer and runner are in the verification process. Runner can enter this code to complete delivery.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
                    Cancelled at: {order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('en-US') : 'N/A'}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Ratings (Admin View) */}
        {order.status === "Completed" && (
          <Card>
            <CardHeader>
              <CardTitle>Ratings</CardTitle>
              <CardDescription>
                Customer and runner ratings for this completed order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[#15171c] px-3 py-2">
                  <div className="text-xs text-slate-400 mb-2">Customer → Runner</div>
                  <RatingStars
                    value={order.runner_rating ?? 0}
                    readOnly
                    size="sm"
                    className="mt-1"
                  />
                  {order.runner_rating && (
                    <div className="text-xs text-slate-500 mt-1">
                      {order.runner_rating} out of 5 stars
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-[#15171c] px-3 py-2">
                  <div className="text-xs text-slate-400 mb-2">Runner → Customer</div>
                  <RatingStars
                    value={order.customer_rating_by_runner ?? 0}
                    readOnly
                    size="sm"
                    className="mt-1"
                  />
                  {order.customer_rating_by_runner && (
                    <div className="text-xs text-slate-500 mt-1">
                      {order.customer_rating_by_runner} out of 5 stars
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Messages (Admin God View - Read Only) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Order Messages</CardTitle>
            </div>
            <CardDescription>
              Complete conversation history for this order. All messages are visible for dispute resolution and QA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderChatThread
              orderId={order.id}
              orderStatus={order.status}
              role="admin"
              variant="admin"
              customerProfile={order.customer || null}
              runnerProfile={order.runner || null}
            />
          </CardContent>
        </Card>
      </div>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Pending Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this pending order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger id="cancellation-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer Request">Customer Request</SelectItem>
                  <SelectItem value="Suspected Fraud">Suspected Fraud</SelectItem>
                  <SelectItem value="Item Unavailable">Item Unavailable</SelectItem>
                  <SelectItem value="Duplicate Order">Duplicate Order</SelectItem>
                  <SelectItem value="Payment Issue">Payment Issue</SelectItem>
                  <SelectItem value="System Error">System Error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cancellationReason === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Custom Reason *</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Please provide a detailed reason for cancellation..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelOrder();
              }}
              disabled={cancelling || !cancellationReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          {timestamp ? new Date(timestamp).toLocaleString('en-US') : 'Pending'}
        </div>
      </div>
    </div>
  );
}
