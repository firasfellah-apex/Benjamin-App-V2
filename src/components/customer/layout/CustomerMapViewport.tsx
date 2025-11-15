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
  // Tuck amount to pin under bottom nav (same as top tuck: 26px)
  const TUCK_AMOUNT = 26;

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
    </div>
  );
};

export default CustomerMapViewport;
