import React from "react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number; // 0-5
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
  readOnly?: boolean;
  className?: string;
};

/**
 * RatingStars Component
 * 
 * Reusable 5-star rating control with click-to-rate functionality.
 * Supports both interactive and read-only modes.
 */
export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
}) => {
  const sizeClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const handleClick = (index: number) => {
    if (readOnly || !onChange) return;
    onChange(index);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i + 1)}
            disabled={readOnly || !onChange}
            className={cn(
              "transition-transform",
              !readOnly && onChange && "active:scale-95 cursor-pointer",
              (readOnly || !onChange) && "cursor-default"
            )}
            aria-label={`Rate ${i + 1} out of 5 stars`}
          >
            <svg
              className={cn(
                sizeClasses,
                filled ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-300"
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 13.9l-4.94 2.8.94-5.49-4-3.9 5.53-.8L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};









