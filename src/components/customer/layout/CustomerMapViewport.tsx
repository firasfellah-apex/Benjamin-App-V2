import React from "react";
import { CustomerMap } from "@/components/maps/CustomerMap";
import type { CustomerAddress } from "@/types/types";

interface CustomerMapViewportProps {
  selectedAddress?: CustomerAddress | {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    label?: string;
  } | null;
  variant?: "fullscreen" | "mini";
  children?: React.ReactNode; // For overlay content (e.g., MapSummaryOverlay)
}

export const CustomerMapViewport: React.FC<CustomerMapViewportProps> = ({
  selectedAddress,
  variant = "fullscreen",
  children,
}) => {
  // Tuck amount to pin under bottom nav (same as top tuck: 26px)
  const TUCK_AMOUNT = 26;

  if (variant === "mini") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={{ height: "200px" }}>
        <CustomerMap
          selectedAddress={selectedAddress}
          className="w-full h-full"
        />
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-none rounded-b-3xl"
      style={{
        height: "70vh", // Fixed height for Google Maps stability
        // Tuck under bottom nav
        marginBottom: `-${TUCK_AMOUNT}px`,
      }}
    >
      <CustomerMap
        selectedAddress={selectedAddress}
        className="w-full h-full"
      />
      {children}
    </div>
  );
};

export default CustomerMapViewport;
