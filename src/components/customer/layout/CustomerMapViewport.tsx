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
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ width: "100%" }}
    >
      <CustomerMap
        selectedAddress={selectedAddress}
        className="w-full h-full"
      />
    </div>
  );
};

export default CustomerMapViewport;
