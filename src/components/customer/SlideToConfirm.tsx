import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";

interface SlideToConfirmProps {
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  confirmedLabel?: string;
}

export function SlideToConfirm({
  onConfirm,
  disabled = false,
  className,
  label = "Slide to confirm",
  confirmedLabel = "Confirmed",
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → 1
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Match button height: py-4 (16px top + 16px bottom) + text line-height (~24px) = ~58px
  const PILL_HEIGHT = 58;          // match your button height (58px like other buttons)
  const PILL_MARGIN = 4;           // spacing inside track
  const MIN_FILL = PILL_HEIGHT;    // green pill never smaller than height
  const CONFIRM_THRESHOLD = 0.8;   // 80%

  // Measure track width
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const maxFillWidth = Math.max(
    MIN_FILL,
    trackWidth - PILL_MARGIN * 2 // keep small margin left/right
  );

  const fillWidth =
    MIN_FILL + progress * Math.max(0, maxFillWidth - MIN_FILL);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - PILL_MARGIN; // relative to inner space

      const clamped = Math.max(0, Math.min(x, maxFillWidth));

      const nextProgress = maxFillWidth > 0 ? clamped / maxFillWidth : 0;

      setProgress(nextProgress);
    },
    [isDragging, maxFillWidth]
  );

  const endDrag = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    if (progress >= CONFIRM_THRESHOLD && !isConfirmed) {
      setProgress(1);
      setIsConfirmed(true);
      onConfirm();
    } else {
      setProgress(0);
    }
  }, [isDragging, progress, isConfirmed, onConfirm]);

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [isDragging, handlePointerMove, endDrag]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (disabled || isConfirmed) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={trackRef}
        role="button"
        aria-disabled={disabled || isConfirmed}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onKeyDown={(e) => {
          if (disabled || isConfirmed) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsConfirmed(true);
            setProgress(1);
            onConfirm();
          }
        }}
        className={cn(
          "relative w-full rounded-full bg-black overflow-hidden",
          "flex items-center justify-center",
          "select-none touch-none",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        style={{ height: PILL_HEIGHT }}
      >
        {/* Label over the track */}
        <span className="pointer-events-none text-sm font-semibold text-white relative z-10">
          {isConfirmed ? confirmedLabel : label}
        </span>

        {/* Green fill pill – chevrons/check live inside this */}
        <div
          className="absolute inset-y-1 left-1 flex items-center justify-end rounded-full bg-emerald-500 shadow-lg"
          style={{
            width: fillWidth,
            transition: isDragging ? "none" : "width 0.2s ease-out",
          }}
        >
          {isConfirmed ? (
            <Check className="h-4 w-4 text-black" />
          ) : (
            !isDragging && (
              <div className="flex items-center gap-[1px] pr-2">
                {[0, 1, 2].map((i) => (
                  <ChevronRight
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5 text-black",
                      !isDragging && !isConfirmed && "slide-hint-chevron"
                    )}
                    style={
                      !isDragging && !isConfirmed
                        ? { animationDelay: `${i * 70}ms` }
                        : undefined
                    }
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

