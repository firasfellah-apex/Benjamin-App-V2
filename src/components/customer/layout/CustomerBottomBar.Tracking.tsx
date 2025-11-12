/**
 * CustomerBottomBarTracking Component
 * 
 * Bottom bar for active order tracking.
 * Starts at hugging height but can expand upward (bottom sheet).
 * Foundation for expanded state (to be connected later).
 */

import React from "react";
import { cn } from "@/lib/utils";

interface CustomerBottomBarTrackingProps {
  expanded?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const CustomerBottomBarTracking: React.FC<CustomerBottomBarTrackingProps> = ({
  expanded = false,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-t-[32px]",
        "shadow-[0_-10px_30px_rgba(15,23,42,0.08)]",
        "px-6 transition-all duration-300 overflow-hidden",
        expanded ? "h-[60vh]" : "pb-6 pt-4",
        className
      )}
    >
      {children}
    </div>
  );
};

