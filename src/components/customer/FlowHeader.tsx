import { cn } from "@/lib/utils";
import { ArrowLeft, X } from "lucide-react";

interface FlowHeaderProps {
  step: number;
  totalSteps: number;
  mode: "back" | "cancel";
  onPrimaryNavClick: () => void;
  title: string;
  subtitle?: string;
}

export function FlowHeader({
  step,
  totalSteps,
  mode,
  onPrimaryNavClick,
  title,
  subtitle,
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
            "inline-flex items-center gap-1.5",
            "rounded-full border border-slate-200 bg-white",
            "px-3 py-1.5 text-[11px] font-medium text-slate-700",
            "shadow-sm hover:bg-slate-50 active:bg-slate-100",
            "transition-colors"
          )}
        >
          {mode === "back" ? (
            <ArrowLeft className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          <span>{label}</span>
        </button>

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

        {/* Spacer to keep dots centered */}
        <div className="w-[80px]" />
      </div>

      {/* Title & subtitle - aligned with home page */}
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle && (
        <p className="text-slate-500 text-base mt-1 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

