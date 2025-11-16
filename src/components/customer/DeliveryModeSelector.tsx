import { cn } from "@/lib/utils";
import { Zap, ShieldCheck } from "lucide-react";

export type DeliveryMode = "quick_handoff" | "count_confirm";

interface DeliveryModeSelectorProps {
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
  className?: string;
}

const modes = [
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Quick Handoff",
    subtitle: "Our runner verifies your one-time code and hands you a sealed envelope. Fast and discreet — no need to count on the spot.",
    Icon: Zap,
  },
  {
    value: "count_confirm" as DeliveryMode,
    title: "Count Together",
    subtitle: "You open the envelope with the runner present and count the bills before you confirm. Extra peace of mind if you prefer to double-check.",
    Icon: ShieldCheck,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {modes.map((mode) => {
        const selected = mode.value === value;
        const Icon = mode.Icon;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
              selected
                ? "border-emerald-400 bg-emerald-50/70 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border shrink-0",
                selected
                  ? "border-emerald-400 bg-white text-emerald-500"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{mode.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{mode.subtitle}</p>
            </div>
          </button>
        );
      })}
      
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Anyone with your one-time code can receive your envelope.
        You're responsible for who uses it.
      </p>
    </div>
  );
}

