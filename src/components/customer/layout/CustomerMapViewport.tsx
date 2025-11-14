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
}

export const CustomerMapViewport: React.FC<CustomerMapViewportProps> = ({
  selectedAddress,
}) => {
  // Single source of truth for the map band height in the request flow
  // MUST be a fixed pixel value for Google Maps to render tiles
  const HEIGHT = 236;

  return (
    <div
      className="relative w-full"
      style={{ 
        height: `${HEIGHT}px`, 
        minHeight: `${HEIGHT}px`,
        display: "block", // NOT flex
        overflow: "visible", // NOT hidden
      }}
    >
      {/* CustomerMap will stretch to fill this container */}
      <CustomerMap selectedAddress={selectedAddress} className="h-full" />
    </div>
  );
};

export default CustomerMapViewport;
