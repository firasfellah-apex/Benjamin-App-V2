import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, X, HelpCircle } from "lucide-react";
import { MapPinPen } from "@/lib/icons";
import type { LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

interface FlowHeaderProps {
  step: number;
  totalSteps: number;
  mode: "back" | "cancel";
  onPrimaryNavClick: () => void;
  title: string;
  subtitle?: string;
  onSecondaryAction?: () => void;
  showSecondaryAction?: boolean;
  secondaryActionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  hideProgress?: boolean; // Hide progress dots
  onHelpClick?: () => void; // Optional help button handler
  showHelp?: boolean; // Show help button
  helpButtonRef?: React.RefObject<HTMLButtonElement>; // Ref for help button position
}

export function FlowHeader({
  step,
  totalSteps,
  mode,
  onPrimaryNavClick,
  title,
  subtitle,
  onSecondaryAction,
  showSecondaryAction = false,
  secondaryActionIcon = MapPinPen,
  secondaryActionLabel = "Manage addresses",
  hideProgress = false,
  onHelpClick,
  showHelp = false,
  helpButtonRef,
}: FlowHeaderProps) {
  const dots = Array.from({ length: totalSteps });

  const label = mode === "back" ? "Back" : "Cancel";

  return (
    <div className="w-full">
      {/* Top row: nav button + dots (replaces logo/menu row) */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrimaryNavClick}
          className={cn(
            "inline-flex items-center justify-center",
            "rounded-xl bg-[#F7F7F7]",
            "w-12 h-12", // 48x48px circle
            "text-slate-900",
            "hover:bg-[#F7F7F7]/80 active:bg-[#F7F7F7]/60",
            "transition-colors",
            "touch-manipulation"
          )}
          aria-label={label}
        >
          {mode === "back" ? (
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          ) : (
            <X className="h-5 w-5" strokeWidth={2} />
          )}
        </button>

        {!hideProgress && (
          <div className="flex items-center gap-1.5">
            {dots.map((_, idx) => {
              const stepNumber = idx + 1;
              const isComplete = stepNumber < step;
              const isCurrent = stepNumber === step;
              const isPending = stepNumber > step;
              
              return (
                <span
                  key={idx}
                  className={cn(
                    "inline-block rounded-full transition-all h-1.5",
                    "w-[56px]", // Equal width for all bars
                    isComplete && "bg-[#13F287]", // Green for complete steps
                    isCurrent && "bg-slate-900", // Black for current step
                    isPending && "bg-slate-300" // Grey for pending steps
                  )}
                />
              );
            })}
          </div>
        )}

        {/* Secondary action button (location pin, bank icon, etc.) or help button or spacer */}
        {showSecondaryAction && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className={cn(
              "inline-flex items-center justify-center",
              "rounded-xl bg-[#F7F7F7]",
              "w-12 h-12", // 48x48px circle
              "text-slate-900",
              "hover:bg-[#F7F7F7]/80 active:bg-[#F7F7F7]/60",
              "transition-colors",
              "touch-manipulation"
            )}
            aria-label={secondaryActionLabel}
          >
            {React.createElement(secondaryActionIcon, { className: "h-5 w-5", strokeWidth: 2 })}
          </button>
        ) : showHelp && onHelpClick ? (
          <IconButton
            ref={helpButtonRef}
            type="button"
            onClick={onHelpClick}
            variant="default"
            size="default"
            className="w-12 h-12 rounded-xl bg-[#F7F7F7] hover:bg-[#F7F7F7]/80 active:bg-[#F7F7F7]/60"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5 text-slate-900" strokeWidth={2} />
          </IconButton>
        ) : hideProgress ? (
          <div className="w-12 h-12" /> // Match button width when no progress
        ) : (
          <div className="w-[80px]" />
        )}
      </div>

      {/* Title & subtitle - aligned with home page */}
      {/* pb-6 ensures 24px spacing from subtitle to divider (matches CustomerHeader) */}
      <div className="pb-6">
        <h1 className="text-2xl font-semibold leading-snug tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 text-base mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

