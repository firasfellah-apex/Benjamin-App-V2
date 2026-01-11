import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";

interface SlideToSkipProps {
  onSkip: () => void;
  disabled?: boolean;
  className?: string;
  trackClassName?: string; // Custom styling for the track
  handleClassName?: string; // Custom styling for the handle
  label?: string; // Custom label text (defaults to "Slide to Skip")
  confirmedLabel?: string;
  isLoading?: boolean; // Loading state after confirmation
  loadingLabel?: string; // Label to show during loading
}

/**
 * SlideToSkip Component
 * 
 * Similar to SlideToConfirm but styled for skip action (red theme).
 * Requires deliberate slide gesture to prevent accidental skips.
 */
export function SlideToSkip({
  onSkip,
  disabled = false,
  className,
  trackClassName,
  handleClassName,
  label = "Slide to Skip",
  confirmedLabel = "Skipped",
  isLoading = false,
  loadingLabel = "Skipping...",
}: SlideToSkipProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → 1
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  const TRACK_HEIGHT = 56;
  const HANDLE_HEIGHT = 50;
  const HANDLE_WIDTH = 96;
  const HANDLE_MARGIN = 3;
  const CONFIRM_THRESHOLD = 0.8; // 80%

  // Measure track width
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Calculate max width for handle (stretches from left, pinned to left edge)
  const maxHandleWidth = Math.max(HANDLE_WIDTH, trackWidth - HANDLE_MARGIN * 2);
  const handleWidth = HANDLE_WIDTH + progress * (maxHandleWidth - HANDLE_WIDTH);

  // Right edge of the red pill, measured from the left edge of the track
  const pillRight = HANDLE_MARGIN + handleWidth;

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - HANDLE_MARGIN;

      // Calculate progress: 0 when at HANDLE_WIDTH, 1 when at maxHandleWidth
      const availableWidth = maxHandleWidth - HANDLE_WIDTH;
      const clamped = Math.max(HANDLE_WIDTH, Math.min(x, maxHandleWidth));
      const nextProgress = availableWidth > 0 ? (clamped - HANDLE_WIDTH) / availableWidth : 0;

      setProgress(Math.min(1, Math.max(0, nextProgress)));
    },
    [isDragging, maxHandleWidth]
  );

  const endDrag = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    if (progress >= CONFIRM_THRESHOLD && !isConfirmed) {
      setProgress(1); // Stretch to full width
      setIsConfirmed(true);
      setShowCheckmark(true);
      onSkip();
    } else {
      setProgress(0); // Return to initial width
    }
  }, [isDragging, progress, isConfirmed, onSkip]);

  // Handle checkmark display timing: show for 300ms, then hide if loading
  useEffect(() => {
    if (isConfirmed && showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, showCheckmark]);

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

  // Padding that keeps the text clear of the initial handle footprint
  const LABEL_PADDING_LEFT = HANDLE_MARGIN + HANDLE_WIDTH + 12;

  // Determine label text based on state
  const labelText = isLoading && isConfirmed 
    ? loadingLabel 
    : isConfirmed 
    ? confirmedLabel 
    : label;

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
            onSkip();
          }
        }}
        className={cn(
          "relative w-full overflow-hidden",
          "flex items-center justify-center",
          "select-none touch-none",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "cursor-pointer",
          // Default styles if no custom className provided
          !trackClassName && "rounded-[12px] bg-red-500/20 border border-red-500/30",
          trackClassName
        )}
        style={{ height: TRACK_HEIGHT }}
      >
        {/* LABEL LAYERS */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base layer: white text, full width, centered */}
          <div
            className="flex h-full items-center justify-center"
            style={{ paddingLeft: LABEL_PADDING_LEFT - 6 }}
          >
            <span className="text-base font-semibold text-white">
              {labelText}
            </span>
          </div>

          {/* Overlay layer: black text, same position, clipped to pillRight */}
          {handleWidth > 0 && (
            <div
              className="absolute top-0 bottom-0 overflow-hidden"
              style={{
                left: 0,
                width: pillRight,
              }}
            >
              <div
                className="flex h-full items-center justify-center"
                style={{ paddingLeft: LABEL_PADDING_LEFT - 6 }}
              >
                <span className="text-base font-semibold text-black">
                  {labelText}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Red Pill Handle - pinned to left, stretches right */}
        <div
          className={cn(
            "absolute rounded-[9px] bg-red-500 flex items-center justify-center font-medium transition-all duration-150 ease-out z-20",
            handleClassName
          )}
          style={{
            left: `${HANDLE_MARGIN}px`,
            top: `${HANDLE_MARGIN}px`,
            width: handleWidth,
            height: HANDLE_HEIGHT,
            transition: isDragging ? "none" : "width 0.2s ease-out",
          }}
        >
          {isConfirmed && showCheckmark && !isLoading ? (
            <X className="h-4 w-4 text-white" />
          ) : isConfirmed && isLoading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            !isDragging && (
              <X className="h-4 w-4 text-white" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

