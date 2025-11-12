import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface RequestCashStepperNavProps {
  currentStep: number;         // 1-based: 1=Address, 2=Amount, 3=Review (if used)
  totalSteps: number;          // for this flow (2 or 3)
  onBack?: () => void;         // optional, if no back on this step, pass undefined
  onPrimary: () => void;       // main CTA handler
  primaryLabel: string;        // e.g. "Continue to amount", "Request cash delivery"
  disabled?: boolean;          // disable when validating/submitting
  showSteps?: boolean;         // whether to render dots (false on Home)
}

export const RequestCashStepperNav: React.FC<RequestCashStepperNavProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onPrimary,
  primaryLabel,
  disabled,
  showSteps = true,
}) => {
  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-40 bg-white"
      style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
    >
      <div 
        className="mx-auto w-full max-w-md px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 rounded-t-3xl"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        {/* Step dots */}
        {showSteps && totalSteps > 1 && (
          <div className="flex justify-center mb-3 gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepIndex = index + 1;
              const isActive = stepIndex === currentStep;
              const isCompleted = stepIndex < currentStep;

              return (
                <div
                  key={stepIndex}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-220",
                    isActive ? "w-5" : "w-2.5",
                    isCompleted && "bg-black",
                    isActive && "bg-black",
                    !isActive && !isCompleted && "bg-zinc-300"
                  )}
                  style={{
                    opacity: isActive || isCompleted ? 1 : 0.4,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Nav bar */}
        <div className="flex items-center gap-3">
          {/* Back (only when provided) */}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={disabled}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-800 shadow-sm",
                "transition-all duration-200",
                disabled && "opacity-60 cursor-not-allowed",
                !disabled && "hover:scale-[1.02] active:scale-[0.97]"
              )}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </button>
          ) : (
            // keep layout consistent when no Back
            <div className="flex-1" />
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onPrimary}
            disabled={disabled}
            className={cn(
              "flex h-12 flex-[2] items-center justify-center rounded-full bg-black text-sm font-semibold text-white shadow-xl",
              "transition-all duration-200",
              disabled && "opacity-60 cursor-not-allowed",
              !disabled && "hover:scale-[1.02] active:scale-[0.97]"
            )}
          >
            {disabled ? "Processing..." : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

