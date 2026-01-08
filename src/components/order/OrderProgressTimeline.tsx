import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/types";
import {
  getCustomerFacingStatus,
  CUSTOMER_TIMELINE_STEPS,
  type CustomerFacingStep,
} from "@/lib/customerStatus";
import LottieComponent from "lottie-react";
import progressLoaderAnimation from "@/assets/animations/progressloader.json";

type TimelineStep = {
  id: string;
  label: string;
  description?: string;
};

type OrderProgressTimelineProps = {
  currentStatus: OrderStatus;
  variant: "customer" | "internal";
  tone?: "customer" | "runner";
  // Optional: Override the current step (useful for arrival detection)
  currentStep?: CustomerFacingStep;
  // Optional: Order object with timestamps for showing completion times
  order?: {
    created_at?: string;
    runner_accepted_at?: string | null;
    runner_at_atm_at?: string | null;
    cash_withdrawn_at?: string | null;
    handoff_completed_at?: string | null;
  } | null;
};

export function OrderProgressTimeline({
  currentStatus,
  variant,
  tone = "customer",
  currentStep: currentStepOverride,
  order = null,
}: OrderProgressTimelineProps) {
  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string | null | undefined): string | null => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  };

  // Map customer-facing steps to order timestamp fields
  const getStepTimestamp = (stepId: CustomerFacingStep): string | null => {
    if (!order) return null;
    
    switch (stepId) {
      case 'REQUESTED':
        return order.created_at || null;
      case 'ASSIGNED':
        return order.runner_accepted_at || null;
      case 'PREPARING':
        return order.runner_at_atm_at || null;
      case 'ON_THE_WAY':
        return order.cash_withdrawn_at || null;
      case 'ARRIVED':
        // ARRIVED doesn't have a direct timestamp, it's based on order_events
        return null;
      case 'COMPLETED':
        return order.handoff_completed_at || null;
      default:
        return null;
    }
  };
  let steps: TimelineStep[] = [];
  let currentIndex = -1;
  const isCanceled = currentStatus === "Cancelled";
  const isRunner = tone === "runner";

  if (variant === "customer") {
    const currentStep =
      currentStepOverride || getCustomerFacingStatus(currentStatus).step;

    steps = CUSTOMER_TIMELINE_STEPS.map((s) => ({
      id: s.step,
      label: s.label,
      description: s.description,
    }));

    if (!isCanceled) {
      currentIndex = steps.findIndex((s) => s.id === currentStep);
      if (currentIndex === -1) {
        currentIndex =
          currentStep === "COMPLETED" ? steps.length - 1 : 0;
      }
    }
  } else {
    // Internal chain-of-custody steps
    steps = [
      {
        id: "Pending",
        label: "Pending",
        description: "Awaiting runner acceptance",
      },
      {
        id: "Runner Accepted",
        label: "Runner accepted",
        description: "Runner committed to delivery",
      },
      {
        id: "Runner at ATM",
        label: "Runner at ATM",
        description: "Preparing cash withdrawal",
      },
      {
        id: "Cash Withdrawn",
        label: "Cash withdrawn",
        description: "Cash secured, en route",
      },
      {
        id: "Pending Handoff",
        label: "Pending handoff",
        description: "Awaiting customer meetup",
      },
      {
        id: "Completed",
        label: "Completed",
        description: "Delivery confirmed",
      },
    ];

    if (!isCanceled) {
      currentIndex = steps.findIndex((s) => s.id === currentStatus);
    }
  }

  const isOrderCompleted = currentStatus === "Completed";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/90 shadow-sm px-4 py-5",
        "backdrop-blur-sm",
        isRunner
          ? "border-[rgba(148,163,253,0.3)] bg-[#050816]"
          : "border-black/5"
      )}
    >
      <div className="relative">
        {/* Single continuous vertical line that connects all nodes */}
        {/* Base line - spans the full height */}
        <div
          className={cn(
            "absolute left-[7px] top-0 bottom-0 w-px z-0",
            isRunner ? "bg-slate-700/60" : "bg-neutral-200"
          )}
        />
        
        {/* Gradient overlay for completed/current segments - this is the green line */}
        {!isCanceled && currentIndex >= 0 && (
          <div
            className={cn(
              "absolute left-[7px] w-px z-0",
              isRunner
                ? "bg-gradient-to-b from-[#4F46E5] via-[#13F287]"
                : "bg-gradient-to-b from-[#13F287] to-[#13F287]"
            )}
            style={{
              top: '0px',
              bottom: `${((steps.length - currentIndex - 1) / steps.length) * 100}%`,
            }}
          />
        )}

        <div className="space-y-5 relative">
          {steps.map((step, index) => {
            const isCompleted = isOrderCompleted ? true : index < currentIndex;

            const isCurrent =
              !isCanceled &&
              !isOrderCompleted &&
              index === currentIndex &&
              currentIndex >= 0;

            const isFuture = !isOrderCompleted && index > currentIndex;

            const showAsCompleted = isCompleted && !isCurrent;

            return (
              <div
                key={step.id}
                className="flex items-center gap-3 last:pb-0 pb-2 relative z-10"
              >
                {/* Rail: node positioned on the vertical line */}
                <div className="flex flex-col items-center relative self-start pt-0.5">
                  {/* Node - positioned on the vertical line */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-200 relative z-10",
                      isRunner
                        ? showAsCompleted &&
                            "w-3.5 h-3.5 bg-[#4F46E5]" ||
                          isCurrent &&
                            "w-4 h-4 bg-[#4F46E5] ring-4 ring-[#4F46E5]/30" ||
                          isFuture &&
                            "w-3.5 h-3.5 border border-slate-600 bg-[#050816]"
                        : showAsCompleted &&
                            "w-3.5 h-3.5 bg-[#13F287]" ||
                          isCurrent &&
                            "w-4 h-4 bg-[#13F287] ring-4 ring-[#13F287]/30" ||
                          isFuture &&
                            "w-3.5 h-3.5 border border-neutral-300 bg-white"
                    )}
                  >
                    {showAsCompleted && (
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    )}
                    {isCurrent && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                </div>

              {/* Text content */}
              <div className="flex-1 flex items-start justify-between gap-4">
                <div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isRunner
                        ? (showAsCompleted || isCurrent) &&
                          "text-white" ||
                          "text-slate-500"
                        : (showAsCompleted || isCurrent) &&
                          "text-slate-900" ||
                          "text-neutral-400"
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div
                      className={cn(
                        "text-xs mt-0.5 leading-snug",
                        isRunner
                          ? (showAsCompleted || isCurrent) &&
                            "text-slate-300" ||
                            "text-slate-600"
                          : (showAsCompleted || isCurrent) &&
                            "text-slate-500" ||
                            "text-neutral-300"
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>

                {/* Right-side meta (timestamp or status) */}
                <div className="text-right min-w-[72px]">
                  {!isCanceled && (
                    <>
                      {isCurrent ? (
                        <div className="inline-flex items-center justify-center w-8 h-8">
                          <LottieComponent
                            animationData={progressLoaderAnimation}
                            loop={true}
                            autoplay={true}
                            style={{ width: '32px', height: '32px' }}
                          />
                        </div>
                      ) : showAsCompleted ? (
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            isRunner
                              ? "text-slate-400"
                              : "text-slate-400"
                          )}
                        >
                          {(() => {
                            const stepId = step.id as CustomerFacingStep;
                            const timestamp = getStepTimestamp(stepId);
                            return timestamp ? formatTimestamp(timestamp) || "" : "";
                          })()}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Cancelled state */}
        {isCanceled && (
          <div className="flex items-start gap-3 pt-2 border-t border-neutral-200/60 relative z-10">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-3.5 h-3.5 rounded-full",
                  isRunner ? "bg-slate-700" : "bg-neutral-400"
                )}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <div>
              <div
                className={cn(
                  "text-sm font-semibold",
                  isRunner ? "text-slate-300" : "text-neutral-700"
                )}
              >
                Canceled
              </div>
              <div
                className={cn(
                  "text-xs mt-0.5",
                  isRunner ? "text-slate-500" : "text-neutral-400"
                )}
              >
                This request has been canceled.
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
