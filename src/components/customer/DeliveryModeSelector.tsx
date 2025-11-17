import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, ShieldCheck, AlertCircle } from "lucide-react";

export type DeliveryMode = "quick_handoff" | "count_confirm";

interface DeliveryModeSelectorProps {
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
  className?: string;
}

const modes = [
  {
    value: "count_confirm" as DeliveryMode,
    title: "Counted",
    subtitle: "You open the envelope with the runner present and count the bills before you confirm. Extra peace of mind if you prefer to double-check.",
    Icon: ShieldCheck,
  },
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Speed",
    subtitle: "Our runner verifies your one-time code and hands you a sealed envelope. Fast and discreet — no need to count on the spot.",
    Icon: Zap,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Pill-shaped toggle with morphing background - iOS-style button morph effect */}
      <div className="relative flex rounded-full border border-slate-200 bg-white p-1 overflow-hidden">
        {/* Morphing background indicator - slides between positions */}
        {modes.map((mode) => {
          const selected = mode.value === value;
          if (!selected) return null;
          
          return (
            <motion.div
              key={mode.value}
              layoutId="delivery-mode-bg"
              className="absolute inset-y-1 rounded-full bg-black"
              initial={false}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                width: "calc(50% - 4px)",
                left: mode.value === modes[0].value ? "4px" : "calc(50% + 2px)",
              }}
            />
          );
        })}

        {modes.map((mode) => {
          const selected = mode.value === value;
          const Icon = mode.Icon;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 px-4 py-3 z-10",
                "text-base font-semibold rounded-full",
                "transition-colors duration-200",
                selected
                  ? "text-white"
                  : "text-slate-900"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected ? "selected" : "unselected"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Icon 
                    className={cn("h-5 w-5", selected ? "text-emerald-400" : "text-slate-900")} 
                  />
                  <span>{mode.title}</span>
                </motion.div>
              </AnimatePresence>
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
        {value && (
          <div className="pt-3">
            <p className="text-sm leading-relaxed text-slate-900">
              {modes.find(m => m.value === value)?.subtitle}
            </p>
          </div>
        )}
      </motion.div>
      
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] leading-snug text-slate-500">
            Anyone with your one-time code can receive your envelope.
            You're responsible for who uses it.
          </p>
        </div>
      </div>
    </div>
  );
}

