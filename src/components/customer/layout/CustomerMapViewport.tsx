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
  // Minimum height fallback for Google Maps to render tiles
  // On home screen, this will grow to fill available space via flex-1
  const HEIGHT = 236;

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-t-3xl rounded-b-3xl"
      style={{ 
        minHeight: `${HEIGHT}px`,
        display: "block", // NOT flex
      }}
    >
      {/* CustomerMap will stretch to fill this container */}
      <CustomerMap selectedAddress={selectedAddress} className="h-full" />
    </div>
  );
};

export default CustomerMapViewport;
