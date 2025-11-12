import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type CustomerFlowStep =
  | "idle"        // Home, no active order
  | "address"     // Confirm delivery location
  | "amount"      // Choose amount
  | "review"      // (optional) final confirm step if present
  | "tracking";   // Active delivery tracking mode

interface CustomerFlowBottomBarProps {
  hasActiveOrder: boolean;
  currentStep: CustomerFlowStep;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;   // e.g. Back
  onCancel?: () => void;            // Cancel action (for address step)
  primaryLabel?: string;            // override label when needed
  primaryDisabled?: boolean;         // disable until form valid
  showDots?: boolean;                // show step dots when in flow
  totalSteps?: number;               // for dots (address/amount/review)
  stepIndex?: number;                // 1-based index in that flow
  activeOrderStatus?: string;       // for tracking mode display
}

// Use Benjamin brand emerald color for the bar background
const BAR_BG = "bg-emerald-500";
const ACCENT = "bg-white text-slate-900"; // white pill with dark label

export function CustomerFlowBottomBar({
  hasActiveOrder,
  currentStep,
  onPrimaryAction,
  onSecondaryAction,
  onCancel,
  primaryLabel,
  primaryDisabled,
  showDots,
  totalSteps = 2,
  stepIndex = 1,
  activeOrderStatus,
}: CustomerFlowBottomBarProps) {
  const location = useLocation();

  // TRACKING MODE: override everything when active order exists
  if (hasActiveOrder && currentStep === "tracking") {
    // Collapsed tracking pill
    return (
      <div className="fixed inset-x-0 bottom-4 flex justify-center z-40 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-[92%] max-w-md",
            "rounded-3xl bg-white shadow-[0_16px_40px_rgba(0,0,0,0.18)] px-4 py-3",
            "flex items-center justify-between gap-3",
            "transition-all duration-220",
            "animate-in fade-in slide-in-from-bottom-4"
          )}
          onClick={onPrimaryAction} // opens full tracking screen / sheet
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPrimaryAction();
            }
          }}
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-emerald-500">
              Live delivery
            </span>
            <span className="text-sm text-slate-800">
              Tap to view status & runner details.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Tracking</span>
          </div>
        </div>
      </div>
    );
  }

  // REQUEST FLOW / IDLE MODE
  const isFirstStep = currentStep === "idle" || currentStep === "address";
  const label =
    primaryLabel ||
    (currentStep === "idle"
      ? "Request Cash"
      : currentStep === "address"
      ? "Continue to amount"
      : currentStep === "amount"
      ? "Request cash delivery"
      : currentStep === "review"
      ? "Confirm request"
      : "Continue");

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-30 pointer-events-none"
      style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
    >
      <div
        className={cn(
          "pointer-events-auto",
          BAR_BG,
          "rounded-t-3xl rounded-b-none",
          "shadow-[0_-10px_30px_rgba(0,0,0,0.25)]",
          "px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3",
          "flex flex-col items-stretch"
        )}
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        {/* Step dots for multi-step flow */}
        {showDots && (
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const active = i + 1 <= stepIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    active ? "w-5 bg-white/90" : "w-2 bg-white/40"
                  )}
                />
              );
            })}
          </div>
        )}

        {/* Cancel button (only on address step) */}
        {currentStep === "address" && onCancel && (
          <button
            onClick={onCancel}
            className={cn(
              "mb-2 self-start",
              "text-xs text-white/80",
              "underline-offset-2",
              "hover:text-white transition-colors",
              "transition-all duration-200"
            )}
          >
            Cancel request and go home
          </button>
        )}

        {/* Primary CTA */}
        <button
          onClick={onPrimaryAction}
          disabled={primaryDisabled}
          className={cn(
            "w-full",
            ACCENT,
            "font-semibold text-base",
            "rounded-full py-3",
            "flex items-center justify-center gap-2",
            "transition-all duration-200",
            primaryDisabled && "opacity-60 cursor-not-allowed",
            !primaryDisabled && "active:scale-[0.98]"
          )}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

