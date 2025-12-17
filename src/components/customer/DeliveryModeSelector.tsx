import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import speedAnimation from "@/assets/animations/speed.json";
import countedAnimation from "@/assets/animations/counted.json";
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
    mainTitle: "Count the cash with the runner during hand-off.",
    subtitle: "Recommended for first deliveries.",
    animationData: countedAnimation,
  },
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Speed",
    mainTitle: "Quick, discreet hand-off — no counting.",
    subtitle: "Best for repeat deliveries.",
    animationData: speedAnimation,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  const speedLottieRef = useRef<LottieRefCurrentProps>(null);
  const countedLottieRef = useRef<LottieRefCurrentProps>(null);

  const handleModeClick = (modeValue: DeliveryMode) => {
    // Play animation for the clicked mode - reset to beginning and play
    // Do this before updating state to ensure refs are still available
    if (modeValue === "quick_handoff" && speedLottieRef.current) {
      speedLottieRef.current.stop();
      speedLottieRef.current.goToAndPlay(0);
    } else if (modeValue === "count_confirm" && countedLottieRef.current) {
      countedLottieRef.current.stop();
      countedLottieRef.current.goToAndPlay(0);
    }
    
    // Update the selected value
    onChange(modeValue);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pill-shaped toggle - Same style for both options */}
      <div className="rounded-3xl border border-slate-100 bg-[#F7F7F7] p-1 flex gap-2 relative overflow-visible">
        {modes.map((mode) => {
          const selected = mode.value === value;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => handleModeClick(mode.value)}
              className={cn(
                "relative flex-1 h-13 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 z-10",
                selected
                  ? "bg-white text-slate-900 border border-black"
                  : "bg-transparent text-slate-900 border-transparent"
              )}
              style={{ height: '52px' }}
            >
              <div className="h-5 w-5 flex items-center justify-center">
                <Lottie
                  lottieRef={mode.value === "quick_handoff" ? speedLottieRef : countedLottieRef}
                  animationData={mode.animationData}
                  loop={false}
                  autoplay={false}
                  style={{ width: '20px', height: '20px' }}
                  onDataReady={() => {
                    // Show first frame when animation data is ready
                    const ref = mode.value === "quick_handoff" ? speedLottieRef.current : countedLottieRef.current;
                    if (ref) {
                      ref.goToAndStop(0, true);
                    }
                  }}
                />
              </div>
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
            <div className="pt-3 pb-3 text-center">
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                {selectedMode?.mainTitle}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                {selectedMode?.subtitle}
              </p>
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
}

