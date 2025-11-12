/**
 * CustomerBottomBar Component
 * 
 * Fixed bottom bar for customer flow pages.
 * Hugs its content - no fixed height.
 * Supports different modes: idle, requestFlow, tracking.
 * Uses RequestFlowBottomBar for morphing animations in idle/requestFlow modes.
 */

import React from "react";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";
import { cn } from "@/lib/utils";

export type CustomerBottomBarMode = "idle" | "requestFlow" | "tracking";

interface CustomerBottomBarProps {
  mode: CustomerBottomBarMode;
  children?: React.ReactNode; // for custom layouts (used in tracking mode)
  className?: string;
  expanded?: boolean; // for tracking mode expansion (future)
  // Props for RequestFlowBottomBar (idle/requestFlow modes)
  onPrimary?: () => void;
  onSecondary?: () => void;
  isLoading?: boolean;
  primaryDisabled?: boolean;
  requestFlowMode?: "home" | "address" | "amount"; // maps to RequestFlowBottomBar mode
}

export function CustomerBottomBar({
  mode,
  children,
  className,
  expanded = false,
  onPrimary,
  onSecondary,
  isLoading = false,
  primaryDisabled = false,
  requestFlowMode,
}: CustomerBottomBarProps) {
  // For idle and requestFlow modes, use RequestFlowBottomBar for morphing animations
  if (mode === "idle" || mode === "requestFlow") {
    const flowMode = requestFlowMode || (mode === "idle" ? "home" : "address");
    return (
      <RequestFlowBottomBar
        mode={flowMode}
        onPrimary={onPrimary || (() => {})}
        onSecondary={onSecondary}
        isLoading={isLoading}
        primaryDisabled={primaryDisabled}
      />
    );
  }

  // For tracking mode (future), use custom children
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40",
        "max-w-md mx-auto w-full",
        "bg-white rounded-t-[32px]",
        "shadow-[0_-8px_24px_rgba(15,23,42,0.08)]",
        "px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>
  );
}

