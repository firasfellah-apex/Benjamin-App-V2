import React, { memo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SlideToConfirm } from "@/components/customer/SlideToConfirm";
import { DeliveryProgressBar } from "@/components/customer/DeliveryProgressBar";
import { getCustomerFacingStatus, getCustomerFacingStatusWithArrival, type CustomerFacingStep, type CustomerFacingStatus } from "@/lib/customerStatus";
import { canRevealRunnerIdentity, getRunnerDisplayName } from "@/lib/reveal";
import { shouldShowCustomerOtpToCustomer } from "@/lib/revealRunnerView";
import { OtpDisplay } from "@/components/customer/OtpDisplay";
import type { OrderWithDetails, OrderStatus } from "@/types/types";
import { supabase } from "@/db/supabase";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LottieComponent from "lottie-react";
import reorderAnimation from "@/assets/animations/reorder.json";
import lockReorderAnimation from "@/assets/animations/lockreorder.json";

type Mode =
  | "home"           // Home: single "Request Cash"
  | "address"        // Step 1: Confirm Address
  | "amount";        // Step 2: Confirm Amount / Confirm Request

interface RequestFlowBottomBarProps {
  mode: Mode;
  onPrimary: () => void;      // main CTA
  onSecondary?: () => void;   // cancel/back
  onAddAddress?: () => void;  // add address button (for address page)
  isLoading?: boolean;
  primaryDisabled?: boolean;  // disable primary button
  useFixedPosition?: boolean; // if false, uses relative positioning for flex layouts
  primaryLabel?: string;      // optional custom label (overrides mode-based label)
  primaryIcon?: React.ReactNode; // optional icon to show inside primary button
  primaryTooltip?: string;    // optional tooltip message to show when button is disabled
  termsContent?: React.ReactNode; // optional terms text/content to show above buttons
  useSliderButton?: boolean;   // if true, use slider button instead of regular button (amount page only)
  activeOrder?: OrderWithDetails | null; // Active order for progress display
}

export const RequestFlowBottomBar: React.FC<RequestFlowBottomBarProps> = memo(({
  mode,
  onPrimary,
  onSecondary,
  onAddAddress,
  isLoading = false,
  primaryDisabled = false,
  useFixedPosition = true, // default to fixed for backward compatibility
  primaryLabel: customPrimaryLabel,
  primaryIcon,
  primaryTooltip,
  termsContent,
  useSliderButton = false, // default to false to keep current behavior
  activeOrder = null,
}) => {
  const [customerStatus, setCustomerStatus] = useState<CustomerFacingStatus | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get customer status - same logic as ActiveDeliverySheet
  useEffect(() => {
    const updateCustomerStatus = async () => {
      if (!activeOrder) {
        setCustomerStatus(null);
        return;
      }

      if (activeOrder.status === 'Pending Handoff') {
        const status = await getCustomerFacingStatusWithArrival(activeOrder.status, activeOrder);
        setCustomerStatus(status);
      } else {
        const status = getCustomerFacingStatus(activeOrder.status);
        setCustomerStatus(status);
      }
    };

    updateCustomerStatus();

    // Poll for arrival status periodically when in Pending Handoff
    if (activeOrder?.status === 'Pending Handoff' && activeOrder?.id) {
      const checkArrival = async () => {
        const status = await getCustomerFacingStatusWithArrival(activeOrder.status, activeOrder);
        setCustomerStatus(status);
      };
      
      checkArrival();
      const interval = setInterval(checkArrival, 3000);
      return () => clearInterval(interval);
    }
  }, [activeOrder?.status, activeOrder?.id, activeOrder]);

  // Subscribe to order_events for runner arrival updates
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'Pending Handoff' || !activeOrder.id) return;

    const channel = supabase
      .channel(`order-events:${activeOrder.id}:runner-arrived`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_events',
          filter: `order_id=eq.${activeOrder.id}`,
        },
        async (payload: any) => {
          if (payload.new?.client_action_id === 'runner_arrived') {
            const { getOrderById } = await import('@/db/api');
            try {
              const freshOrder = await getOrderById(activeOrder.id);
              if (freshOrder) {
                const status = await getCustomerFacingStatusWithArrival('Pending Handoff', freshOrder);
                setCustomerStatus(status);
              }
            } catch (error) {
              console.error('Error fetching fresh order after arrival:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeOrder?.status, activeOrder?.id]);

  // Label logic
  const primaryLabel =
    customPrimaryLabel ||
    (activeOrder && customerStatus
      ? "Track Order"
      : mode === "home"
      ? "Order Cash"
      : mode === "address"
      ? "Continue to Amount"
      : "Confirm Order");

  const secondaryLabel =
    mode === "address"
      ? "Cancel"
      : mode === "amount"
      ? "Back"
      : "";

  const isSingleMode = mode === "home";
  const showActiveOrderProgress = activeOrder && customerStatus && mode === "home";

  return (
    <nav
      data-request-flow-bottom-bar
      className={cn(
        useFixedPosition ? "fixed bottom-0 left-0 right-0 z-[70]" : "w-full flex-shrink-0",
        "w-screen max-w-none",
        "bg-white border-t border-slate-200/70"
      )}
    >
      {/* Standardized spacing: px-6 py-6 (24px all around) */}
      {/* Bottom padding includes safe area inset for devices with home indicator */}
      <div className="w-full px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Active Order Progress - shown when there's an active order - matches collapsed modal */}
        {showActiveOrderProgress && customerStatus && activeOrder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-4 space-y-4"
          >
            {/* Title and Sub Label - Grouped together (same as collapsed modal) */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{customerStatus.label}...</h3>
              <p className="text-sm text-slate-600 pt-[6px]">
                {customerStatus.step === 'ON_THE_WAY'
                  ? (() => {
                      const showRunnerIdentity = canRevealRunnerIdentity(activeOrder.status);
                      const runnerName = showRunnerIdentity && activeOrder.runner 
                        ? getRunnerDisplayName(
                            (activeOrder.runner as any)?.first_name,
                            (activeOrder.runner as any)?.last_name
                          )
                        : 'Your runner';
                      return `${runnerName} has your cash and is heading your way.`;
                    })()
                  : customerStatus.step === 'ARRIVED'
                  ? 'Please meet up and share your verification code to receive your cash.'
                  : customerStatus.description}
              </p>
            </div>

            {/* Progress Bar (same as collapsed modal) */}
            <div className="py-3">
              <DeliveryProgressBar currentStep={customerStatus.step} />
            </div>

            {/* OTP Code Display - Compact summary for bottom nav */}
            {shouldShowCustomerOtpToCustomer(activeOrder.status, !!activeOrder.otp_code) && activeOrder.otp_code && customerStatus && (
              <OtpDisplay otpCode={activeOrder.otp_code} customerStatusStep={customerStatus.step} />
            )}
          </motion.div>
        )}

        {/* Terms content - only on amount page, above primary CTA */}
        {termsContent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-4 flex items-center justify-center"
          >
            {termsContent}
          </motion.div>
        )}

        {/* Add Another Address button - only on address page, above primary CTA */}
        {onAddAddress && mode === "address" && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            type="button"
            onClick={onAddAddress}
            className={cn(
              "w-full h-14 rounded-xl border border-[#F0F0F0] bg-white px-6 mb-3",
              "text-base font-semibold text-slate-900",
              "flex items-center justify-center",
              "active:scale-[0.98] transition-transform duration-150"
            )}
          >
            Add Another Address
          </motion.button>
        )}

      <div className={cn("flex w-full gap-3 items-center justify-center")}>
        <AnimatePresence mode="wait" initial={false}>
          {isSingleMode ? (
            primaryDisabled && primaryTooltip ? (
              <Tooltip key="single-tooltip" open={showTooltip} onOpenChange={setShowTooltip}>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowTooltip((prev) => !prev);
                    }}
                    className="w-full cursor-pointer"
                  >
                    <motion.button
                      layoutId={`ts-cta-${mode}`}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        backgroundColor: '#D1D5DB'
                      }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ 
                        duration: 0.3, 
                        ease: [0.34, 1.56, 0.64, 1],
                        backgroundColor: { duration: 0.2 },
                        layout: { 
                          duration: 0.4,
                          ease: [0.34, 1.56, 0.64, 1]
                        }
                      }}
                      type="button"
                      disabled={true}
                      className={cn(
                        "w-full rounded-xl py-4 px-6",
                        "text-base font-semibold",
                        "flex items-center justify-center",
                        "transition-colors duration-200",
                        "cursor-not-allowed"
                      )}
                      style={{ color: '#6B7280' }}
                    >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={primaryLabel}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        {/* Show lock animation for Reorder when disabled */}
                        {primaryLabel === "Reorder" && primaryDisabled && (
                          <div className="w-5 h-5 flex items-center justify-center">
                            <LottieComponent
                              animationData={lockReorderAnimation}
                              loop={false}
                              autoplay={true}
                              style={{ width: '20px', height: '20px' }}
                            />
                          </div>
                        )}
                        {isLoading ? "Processing..." : primaryLabel}
                        {/* Only show primaryIcon if it's not Reorder (to avoid duplicate icon) */}
                        {primaryLabel !== "Reorder" && primaryIcon}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                  onClick={() => setShowTooltip(false)}
                >
                  <p className="leading-relaxed">{primaryTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
            <motion.button
              key="single"
              layoutId={`ts-cta-${mode}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ 
                opacity: 1,
                scale: 1,
                backgroundColor: (isLoading || primaryDisabled) ? '#D1D5DB' : '#000000'
              }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.34, 1.56, 0.64, 1],
                backgroundColor: { duration: 0.2 },
                layout: { 
                  duration: 0.4,
                  ease: [0.34, 1.56, 0.64, 1]
                }
              }}
              type="button"
              onClick={onPrimary}
              disabled={isLoading || primaryDisabled}
              className={cn(
                "w-full rounded-xl py-4 px-6",
                "text-base font-semibold",
                "flex items-center justify-center",
                "transition-colors duration-200",
                (isLoading || primaryDisabled) 
                  ? "text-gray-500 cursor-not-allowed" 
                  : "text-white"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={primaryLabel}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                >
                  {/* Show reorder animation for Reorder when enabled */}
                  {primaryLabel === "Reorder" && !primaryDisabled && !isLoading && (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <LottieComponent
                        animationData={reorderAnimation}
                        loop={false}
                        autoplay={true}
                        style={{ width: '20px', height: '20px' }}
                      />
                    </div>
                  )}
                  {/* Show lock animation for Reorder when disabled */}
                  {primaryLabel === "Reorder" && primaryDisabled && (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <LottieComponent
                        animationData={lockReorderAnimation}
                        loop={false}
                        autoplay={true}
                        style={{ width: '20px', height: '20px' }}
                      />
                    </div>
                  )}
                  {isLoading ? "Processing..." : primaryLabel}
                  {/* Only show primaryIcon if it's not Reorder (to avoid duplicate icon) */}
                  {primaryLabel !== "Reorder" && primaryIcon}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            )
          ) : (
            <motion.div
              key={`dual-${mode}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.2,
                layout: { 
                  duration: 0.4,
                  ease: [0.34, 1.56, 0.64, 1]
                }
              }}
              className={cn(
                "flex gap-3 w-full",
                mode === "amount" && useSliderButton && "flex-col"
              )}
            >
              {/* Secondary button (Cancel / Back) - hidden when using slider on amount page */}
              {onSecondary && !(mode === "amount" && useSliderButton) && (
                <motion.button
                  layoutId={`action-bar-secondary-${mode}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8, x: -30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -15 }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.34, 1.56, 0.64, 1],
                    layout: { 
                      duration: 0.4,
                      ease: [0.34, 1.56, 0.64, 1]
                    }
                  }}
                  type="button"
                  onClick={onSecondary}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 rounded-xl py-4 px-6",
                    "border border-gray-300",
                    "bg-white text-gray-900",
                    "text-base font-semibold",
                    "flex items-center justify-center",
                    isLoading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`${mode}-${secondaryLabel}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {secondaryLabel}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}

              {/* Primary CTA - either slider button or regular button */}
              {mode === "amount" && useSliderButton ? (
                <SlideToConfirm
                  onConfirm={onPrimary}
                  disabled={isLoading || primaryDisabled}
                  label="Slide to Confirm Order"
                  confirmedLabel="Order confirmed"
                />
              ) : (
                <motion.button
                  layoutId={`ts-cta-${mode}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8, x: 30 }}
                  animate={{ 
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    backgroundColor: (isLoading || primaryDisabled) ? '#D1D5DB' : '#000000'
                  }}
                  exit={{ opacity: 0, scale: 0.9, x: 15 }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.34, 1.56, 0.64, 1],
                    backgroundColor: { duration: 0.2 },
                    layout: { 
                      duration: 0.4,
                      ease: [0.34, 1.56, 0.64, 1]
                    }
                  }}
                  type="button"
                  onClick={onPrimary}
                  disabled={isLoading || primaryDisabled}
                  className={cn(
                    "flex-[2] rounded-xl py-4 px-6",
                    "text-base font-semibold",
                    "flex items-center justify-center",
                    "transition-colors duration-200",
                    (isLoading || primaryDisabled) 
                      ? "text-gray-500 cursor-not-allowed" 
                      : "text-white"
                  )}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`${mode}-${primaryLabel}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      {/* Show reorder animation for Reorder when enabled */}
                      {primaryLabel === "Reorder" && !primaryDisabled && !isLoading && (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <LottieComponent
                            animationData={reorderAnimation}
                            loop={false}
                            autoplay={true}
                            style={{ width: '20px', height: '20px' }}
                          />
                        </div>
                      )}
                      {/* Show lock animation for Reorder when disabled */}
                      {primaryLabel === "Reorder" && primaryDisabled && (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <LottieComponent
                            animationData={lockReorderAnimation}
                            loop={false}
                            autoplay={true}
                            style={{ width: '20px', height: '20px' }}
                          />
                        </div>
                      )}
                      {isLoading ? "Processing..." : primaryLabel}
                      {/* Only show primaryIcon if it's not Reorder (to avoid duplicate icon) */}
                      {primaryLabel !== "Reorder" && primaryIcon}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </nav>
  );
});

