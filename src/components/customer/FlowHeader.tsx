import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, X } from "lucide-react";
import { MapPinPen } from "@/lib/icons";
import type { LucideIcon } from "lucide-react";

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
            "rounded-full border border-[#F0F0F0] bg-white",
            "w-12 h-12", // 48x48px circle
            "text-slate-900",
            "hover:bg-slate-50 active:bg-slate-100",
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
              const active = idx + 1 === step;
              return (
                <span
                  key={idx}
                  className={cn(
                    "inline-block rounded-full transition-all",
                    active
                      ? "w-6 h-1.5 bg-slate-900"
                      : "w-2 h-1.5 bg-slate-300"
                  )}
                />
              );
            })}
          </div>
        )}

        {/* Secondary action button (location pin, bank icon, etc.) or spacer */}
        {showSecondaryAction && onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className={cn(
              "inline-flex items-center justify-center",
              "rounded-full border border-[#F0F0F0] bg-white",
              "w-12 h-12", // 48x48px circle
              "text-slate-900",
              "hover:bg-slate-50 active:bg-slate-100",
              "transition-colors",
              "touch-manipulation"
            )}
            aria-label={secondaryActionLabel}
          >
            {React.createElement(secondaryActionIcon, { className: "h-5 w-5", strokeWidth: 2 })}
          </button>
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

