import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import discreetAnimation from "@/assets/animations/discreet.json";
import countedAnimation from "@/assets/animations/counted2.json";
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
    description: "Count the cash with the runner present.",
    recommendation: "Recommended for first and/or large orders.",
    animationData: countedAnimation,
  },
  {
    value: "quick_handoff" as DeliveryMode,
    title: "Discreet",
    description: "Quick, private hand-off — no on-site counting.",
    recommendation: "Best for discreet orders, and repeat customers.",
    animationData: discreetAnimation,
  },
];

export function DeliveryModeSelector({
  value,
  onChange,
  className,
}: DeliveryModeSelectorProps) {
  const speedLottieRef = useRef<LottieRefCurrentProps>(null);
  const countedLottieRef = useRef<LottieRefCurrentProps>(null);

  // Play animation when a mode becomes selected
  useEffect(() => {
    if (value === "quick_handoff" && speedLottieRef.current) {
      speedLottieRef.current.stop();
      speedLottieRef.current.goToAndPlay(0);
    } else if (value === "count_confirm" && countedLottieRef.current) {
      countedLottieRef.current.stop();
      countedLottieRef.current.goToAndPlay(0);
    }
  }, [value]);

  const handleModeClick = (modeValue: DeliveryMode) => {
    // Update the selected value (animation will play via useEffect)
    onChange(modeValue);
  };

  return (
    <div className={cn("flex gap-3", className)}>
      {modes.map((mode) => {
        const selected = mode.value === value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => handleModeClick(mode.value)}
            className={cn(
              "flex-1 rounded-xl bg-white p-4 text-left transition-all duration-300 ease-in-out",
              "hover:opacity-95 active:opacity-90",
              "flex flex-col items-start",
              selected
                ? "border-2 border-black"
                : "border border-[#F0F0F0] hover:border-[#E0E0E0]"
            )}
          >
            {/* Icon - top left */}
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mb-2">
                <Lottie
                  lottieRef={mode.value === "quick_handoff" ? speedLottieRef : countedLottieRef}
                  animationData={mode.animationData}
                  loop={false}
                  autoplay={selected}
                  style={{ width: '24px', height: '24px' }}
                  onDataReady={() => {
                    // Show first frame when animation data is ready
                    const ref = mode.value === "quick_handoff" ? speedLottieRef.current : countedLottieRef.current;
                    if (ref) {
                      if (selected) {
                        ref.goToAndPlay(0);
                      } else {
                        ref.goToAndStop(0, true);
                      }
                    }
                  }}
                  onComplete={() => {
                    // For discreet animation, keep it at the last frame when complete
                    if (mode.value === "quick_handoff" && speedLottieRef.current) {
                      // Get the animation instance and stop at the last frame
                      const animData = mode.animationData;
                      // Lottie animations typically have op (out point) and ip (in point)
                      // Use op - 1 to get the last frame, or use a very high number
                      const lastFrame = animData.op || 999;
                      speedLottieRef.current.goToAndStop(lastFrame - 1, true);
                    }
                  }}
                />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 w-full">
              {/* Title */}
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {mode.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-slate-900 leading-relaxed mb-1">
                {mode.description}
              </p>
              
              {/* Recommendation */}
              <p className="text-xs text-slate-500 leading-relaxed">
                {mode.recommendation}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

