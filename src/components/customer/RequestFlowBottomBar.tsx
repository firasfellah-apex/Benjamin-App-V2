import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SlideToConfirm } from "@/components/customer/SlideToConfirm";

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
  termsContent?: React.ReactNode; // optional terms text/content to show above buttons
  useSliderButton?: boolean;   // if true, use slider button instead of regular button (amount page only)
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
  termsContent,
  useSliderButton = false, // default to false to keep current behavior
}) => {

  // Label logic
  const primaryLabel =
    customPrimaryLabel ||
    (mode === "home"
      ? "Request Cash"
      : mode === "address"
      ? "Continue to Amount"
      : "Confirm Request");

  const secondaryLabel =
    mode === "address"
      ? "Cancel"
      : mode === "amount"
      ? "Back"
      : "";

  const isSingleMode = mode === "home";

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
              "w-full rounded-full border border-[#F0F0F0] bg-white px-6 py-4 mb-3",
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
                "w-full rounded-full py-4 px-6",
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
                >
                  {isLoading ? "Processing..." : primaryLabel}
                </motion.span>
              </AnimatePresence>
            </motion.button>
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
                    "flex-1 rounded-full py-4 px-6",
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
                  label="Slide to confirm request"
                  confirmedLabel="Request confirmed"
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
                    "flex-[2] rounded-full py-4 px-6",
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
                    >
                      {isLoading ? "Processing..." : primaryLabel}
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

