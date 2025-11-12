import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { getOrderById, advanceOrderStatus, generateOTP, verifyOTP, rateCustomerByRunner, markRunnerArrived } from "@/db/api";
import { useOrderRealtime } from "@/hooks/useOrdersRealtime";
import type { OrderWithDetails, OrderStatus, Order } from "@/types/types";
import { Avatar } from "@/components/common/Avatar";
import { triggerConfetti } from "@/lib/confetti";
import { strings } from "@/lib/strings";
import { 
  getCustomerAddressDisplay, 
  canConfirmAtATM
} from "@/lib/revealRunnerView";
import { OrderChatThread } from "@/components/chat/OrderChatThread";
import { RunnerSubpageLayout } from "@/components/layout/RunnerSubpageLayout";
import { RatingStars } from "@/components/common/RatingStars";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDate } from "@/lib/utils";

function shortId(orderId: string): string {
  return orderId.slice(0, 8);
}

export default function RunnerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [runnerArrived, setRunnerArrived] = useState(false);
  const [submittingCustomerRating, setSubmittingCustomerRating] = useState(false);

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await getOrderById(orderId);
    setOrder(data);
    setLoading(false);
    if (data?.status === "Completed") {
      setRunnerArrived(false);
      setOtpValue("");
    }
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    if (!orderId || !updatedOrder) return;
    
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
    }
    
    getOrderById(orderId).then((data) => {
      if (data && data.id === orderId) {
        setOrder(data);
        if (data.status === "Completed") {
          setRunnerArrived(false);
          setOtpValue("");
        }
      }
    }).catch((error) => {
      console.error('[RunnerOrderDetail] Error fetching full order details:', error);
    });
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
              toast.success("Verification code generated. The customer can now see it in their app.");
            }
          } catch (error: any) {
            console.error("Error auto-generating OTP:", error);
            toast.error("Failed to generate verification code. Please generate it manually.");
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
    if (!orderId || otpValue.length !== 6) {
      toast.error(strings.errors.invalidOTP);
      return;
    }

    setUpdating(true);
    try {
      const result = await verifyOTP(orderId, otpValue);
      if (result.success) {
        triggerConfetti(3000);
        toast.success("Delivery completed successfully!");
        await loadOrder();
        setTimeout(() => navigate("/runner/work"), 2000);
      } else {
        toast.error(result.error || "Invalid OTP. Please try again.");
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
            {/* Delivery Address */}
            <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-medium text-white">Delivery Address</h3>
              </div>
              <p className="text-sm text-slate-300">
                {getCustomerAddressDisplay(order.status, order.customer_address, !!order.otp_code)}
              </p>
            </section>

            {/* Delivery Progress Timeline - Simplified for active orders */}
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

                {/* Completed */}
                {isCompleted && (
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

            {/* Delivery Steps - Only for active orders */}
            <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4 space-y-4">
              {/* Step 1: Before ATM */}
              {order.status === "Runner Accepted" && (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm font-medium text-white mb-2">Head towards the ATM</p>
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
              )}

              {/* Step 2: At ATM */}
              {order.status === "Runner at ATM" && (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm font-medium text-white mb-2">Withdraw Cash</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Withdraw <strong className="text-white">${order.requested_amount.toFixed(2)}</strong> using your Benjamin card. Once you've completed the withdrawal, confirm below.
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
              )}

              {/* Step 3: Cash Withdrawn - OTP Auto-generated */}
              {order.status === "Cash Withdrawn" && !order.otp_code && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm font-medium text-emerald-400 mb-2">Cash Secured</p>
                  <p className="text-xs text-slate-300 mb-4">
                    Great! The cash has been secured. Generating verification code...
                  </p>
                  <div className="text-center py-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                  </div>
                </div>
              )}

              {/* Step 4: Pending Handoff - Head to Customer */}
              {order.status === "Pending Handoff" && order.otp_code && !runnerArrived && (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm font-medium text-white mb-2">Head to Customer</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Proceed to the customer's address for delivery. Confirm your arrival when you reach the location.
                    </p>
                    <div className="p-3 bg-white/5 rounded-lg mb-4 border border-white/10">
                      <div className="text-xs text-slate-400 mb-1">Delivery address:</div>
                      <div className="text-sm font-medium text-white">{order.customer_address || 'Address not available'}</div>
                    </div>
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
              )}

              {/* Step 5: At Arrival - Verify OTP */}
              {order.status === "Pending Handoff" && order.otp_code && runnerArrived && (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm font-medium text-white mb-2">Verify Delivery</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Enter the 6-digit code from the customer to complete the delivery.
                    </p>
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
                              <div className="text-xs text-slate-400 mt-0.5">Ask for the verification code</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                      className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {updating ? "Verifying..." : "Verify and Complete Delivery"}
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* Chat Section - Only after cash withdrawal and on the way to customer */}
            {!isCompleted && (order.status === "Cash Withdrawn" || order.status === "Pending Handoff") && (
              <section className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-slate-300" />
                  <h3 className="text-sm font-medium text-white">Message Customer</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Communicate with the customer about delivery details
                </p>
                <OrderChatThread
                  orderId={order.id}
                  orderStatus={order.status}
                  role="runner"
                  variant="runner"
                />
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
