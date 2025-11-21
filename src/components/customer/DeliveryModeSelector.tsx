import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, ShieldCheck } from "lucide-react";
import {
  HeartIcon,
  CurrencyDollarIcon,
  StarIcon,
  ArrowPathIcon,
  UserIcon,
  CheckCircleIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import type { ComponentType, SVGProps } from "react";

export type DeliveryMode = "quick_handoff" | "count_confirm";

interface DeliveryModeSelectorProps {
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
  className?: string;
}

interface Benefit {
  text: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const modes = [
  {
    value: "count_confirm" as DeliveryMode,
    title: "Counted",
    mainTitle: "You count the cash in front of the runner.",
    subtitle: "For when you want certainty and a moment to double-check every bill.",
    benefits: [
      { text: "Larger amounts", icon: CurrencyDollarIcon },
      { text: "Extra peace of mind", icon: HeartIcon },
      { text: "First-time confidence", icon: StarIcon },
    ] as Benefit[],
    Icon: ShieldCheck,
  },
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Speed",
    mainTitle: "Fast handoff, no counting together.",
    subtitle: "For when you want the envelope now — quick, discreet, and in-and-out.",
    benefits: [
      { text: "Discretion", icon: EyeSlashIcon },
      { text: "Minimal interaction", icon: UserIcon },
      { text: "Regular users who trust the flow", icon: CheckCircleIcon },
    ] as Benefit[],
    Icon: Zap,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Pill-shaped toggle - Same style for both options */}
      <div className="rounded-3xl border border-slate-100 bg-[#F7F7F7] p-1 flex gap-2 relative overflow-visible">
        {modes.map((mode) => {
          const selected = mode.value === value;
          const Icon = mode.Icon;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative flex-1 h-13 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 z-10",
                selected
                  ? "bg-white text-slate-900 border border-black"
                  : "bg-transparent text-slate-900 border-transparent"
              )}
              style={{ height: '52px' }}
            >
              <Icon 
                className="h-5 w-5 text-slate-900" 
              />
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* Description for selected mode - iOS-style expand/collapse */}
      <motion.div
        initial={false}
        animate={{
          height: value ? "auto" : 0,
          opacity: value ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
        style={{ overflow: "hidden" }}
      >
        {value && (() => {
          const selectedMode = modes.find(m => m.value === value);
          return (
            <div className="pt-3 pb-3 text-left">
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                {selectedMode?.mainTitle}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                {selectedMode?.subtitle}
              </p>
              {selectedMode?.benefits && selectedMode.benefits.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Choose this for:</p>
                  <ul className="space-y-2.5">
                    {selectedMode.benefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <li key={index} className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-black shrink-0" />
                          <span className="text-sm text-slate-600 leading-relaxed">{benefit.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
}

