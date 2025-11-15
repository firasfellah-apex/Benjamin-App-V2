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
  // Fixed pixel height for a stable Google Maps container
  const HEIGHT = 360;

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-3xl rounded-b-3xl"
      style={{ height: `${HEIGHT}px` }}
    >
      {/* CustomerMap will stretch to fill this fixed-height container */}
      <CustomerMap
        selectedAddress={selectedAddress}
        className="w-full h-full"
      />
    </div>
  );
};

export default CustomerMapViewport;
