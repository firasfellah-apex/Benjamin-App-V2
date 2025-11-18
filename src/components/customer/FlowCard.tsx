import React from "react";
import { cn } from "@/lib/utils";

interface FlowCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified Card Component for Flow Pages
 * 
 * Spec:
 * - bg-white
 * - border border-[#E5E7EB]
 * - rounded-xl (Uber-style: moderate rounding, not bubbles)
 * - p-5 sm:p-6
 * - no shadow
 */
export function FlowCard({
  children,
  className,
}: FlowCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E5E7EB] rounded-xl p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

