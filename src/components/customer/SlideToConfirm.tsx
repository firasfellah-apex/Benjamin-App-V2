import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SlideToConfirmProps {
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  label?: string; // Not used, kept for backwards compatibility
  confirmedLabel?: string;
}

export function SlideToConfirm({
  onConfirm,
  disabled = false,
  className,
  label: _label, // Not used, kept for backwards compatibility
  confirmedLabel = "Confirmed",
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → 1
  const [isConfirmed, setIsConfirmed] = useState(false);

  const TRACK_HEIGHT = 56; // 56px
  const HANDLE_HEIGHT = 44; // 44px
  const HANDLE_WIDTH = 96; // 96px
  const HANDLE_MARGIN = (TRACK_HEIGHT - HANDLE_HEIGHT) / 2; // 6px top/bottom
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

  // Right edge of the green pill, measured from the left edge of the track
  const pillRight = HANDLE_MARGIN + handleWidth;

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - HANDLE_MARGIN; // Position relative to track (minus left margin)

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
      onConfirm();
    } else {
      setProgress(0); // Return to initial width
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

  // Padding that keeps the text clear of the initial handle footprint
  const LABEL_PADDING_LEFT = HANDLE_MARGIN + HANDLE_WIDTH + 12;

  const labelText = isConfirmed ? confirmedLabel : "Slide to Confirm Request";

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
        style={{ height: TRACK_HEIGHT }}
      >
        {/* LABEL LAYERS */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base layer: white text, full width, centered */}
          <div
            className="flex h-full items-center justify-center"
            style={{ paddingLeft: LABEL_PADDING_LEFT }}
          >
            <span className="text-[15px] font-medium text-white">
              {labelText}
            </span>
          </div>

          {/* Overlay layer: black text, same position, clipped to pillRight */}
          {handleWidth > 0 && (
            <div
              className="absolute top-0 bottom-0 overflow-hidden"
              style={{
                left: 0,
                width: pillRight, // everything under the pill becomes black
              }}
            >
              <div
                className="flex h-full items-center justify-center"
                style={{ paddingLeft: LABEL_PADDING_LEFT }}
              >
                <span className="text-[15px] font-medium text-black">
                  {labelText}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Green Pill Handle - pinned to left, stretches right */}
        <div
          className="absolute rounded-full bg-[#22C55E] flex items-center justify-center font-medium transition-all duration-150 ease-out z-20"
          style={{
            left: `${HANDLE_MARGIN}px`,
            top: `${HANDLE_MARGIN}px`,
            width: handleWidth,
            height: HANDLE_HEIGHT,
            transition: isDragging ? "none" : "width 0.2s ease-out",
          }}
        >
          {isConfirmed && (
            <Check className="h-4 w-4 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}
