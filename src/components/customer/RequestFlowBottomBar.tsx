import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Mode =
  | "home"           // Home: single "Request Cash"
  | "address"        // Step 1: Confirm Address
  | "amount";        // Step 2: Confirm Amount / Confirm Request

interface RequestFlowBottomBarProps {
  mode: Mode;
  onPrimary: () => void;      // main CTA
  onSecondary?: () => void;   // cancel/back
  isLoading?: boolean;
  primaryDisabled?: boolean;  // disable primary button
  useFixedPosition?: boolean; // if false, uses relative positioning for flex layouts
  primaryLabel?: string;      // optional custom label (overrides mode-based label)
}

export const RequestFlowBottomBar: React.FC<RequestFlowBottomBarProps> = memo(({
  mode,
  onPrimary,
  onSecondary,
  isLoading = false,
  primaryDisabled = false,
  useFixedPosition = true, // default to fixed for backward compatibility
  primaryLabel: customPrimaryLabel,
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

  // Simple 2-step indicator for address/amount screens
  const showStepper = mode === "address" || mode === "amount";
  const activeStep = mode === "address" ? 1 : mode === "amount" ? 2 : 0;

  return (
    <nav
      data-request-flow-bottom-bar
      className={cn(
        useFixedPosition ? "fixed bottom-0 left-0 right-0 z-50" : "w-full flex-shrink-0",
        "w-screen max-w-none",
        "bg-white rounded-t-3xl",
        "shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
      )}
    >
      {/* Standardized spacing: px-6 py-6 (24px all around) */}
      {/* Bottom padding includes safe area inset for devices with home indicator */}
      <div className="w-full px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Stepper (only on steps 1 & 2) */}
      <AnimatePresence>
        {showStepper && (
          <motion.div
            key="stepper"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center mb-4 gap-2 overflow-hidden"
          >
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeStep === 1 ? "w-16 bg-black" : "w-8 bg-gray-300"
              )}
            />
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeStep === 2 ? "w-16 bg-black" : "w-8 bg-gray-300"
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("flex w-full gap-3 items-center justify-center")}>
        <AnimatePresence mode="wait" initial={false}>
          {isSingleMode ? (
            <motion.button
              key="single"
              layoutId="ts-cta"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ 
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
              key="dual"
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
              className="flex gap-3 w-full"
            >
              {/* Secondary button (Cancel / Back) */}
              {onSecondary && (
                <motion.button
                  layoutId="action-bar-secondary"
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

              {/* Primary CTA (black pill) - morphs from single button */}
              <motion.button
                layoutId="ts-cta"
                layout
                initial={{ opacity: 0, scale: 0.8, x: 30 }}
                animate={{ 
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </nav>
  );
});

