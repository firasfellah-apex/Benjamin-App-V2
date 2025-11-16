import React from "react";
import { cn } from "@/lib/utils";
import type { CustomerAddress } from "@/types/types";
import type { DeliveryMode } from "./DeliveryModeSelector";

interface MapSummaryOverlayProps {
  address: CustomerAddress | null;
  amount: number | null;
  mode: DeliveryMode | null;
  className?: string;
}

export function MapSummaryOverlay({
  address,
  amount,
  mode,
  className,
}: MapSummaryOverlayProps) {
  if (!address || amount === null || !mode) {
    return null;
  }

  const modeLabel = mode === "quick_handoff" ? "Quick Handoff" : "Count & Confirm";

  return (
    <div
      className={cn(
        "absolute top-3 left-3 z-20",
        "bg-white/90 backdrop-blur-sm",
        "rounded-lg shadow-sm",
        "px-3 py-2",
        "text-sm",
        className
      )}
    >
      <div className="font-semibold text-gray-900">
        {address.label || "Delivery Address"}
      </div>
      <div className="text-gray-600 mt-0.5">
        ${amount.toLocaleString()} — {modeLabel}
      </div>
    </div>
  );
}

