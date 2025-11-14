/**
 * CustomerMap
 *
 * Shared map component for customer screens.
 * - Centers on selected address if provided
 * - Falls back to customer's live location
 * - Falls back to Miami if nothing else is available
 *
 * IMPORTANT: Parent is responsible for height. This component assumes it sits
 * inside a container that gives it a real height, and it stretches to 100%.
 */

import React, { useMemo, useRef, useEffect, useState } from "react";
import { BenjaminMap } from "@/components/maps/BenjaminMap";
import { useCustomerLocation } from "@/hooks/useCustomerLocation";
import type { CustomerAddress } from "@/types/types";
import { cn } from "@/lib/utils";

type LooseAddress =
  | CustomerAddress
  | {
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
      label?: string;
    }
  | null
  | undefined;

interface CustomerMapProps {
  selectedAddress?: LooseAddress;
  className?: string;
}

export const CustomerMap: React.FC<CustomerMapProps> = ({
  selectedAddress,
  className,
}) => {
  const { location, isLoading } = useCustomerLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapHeight, setMapHeight] = useState<string>("236px"); // Default fallback

  // Measure parent height and convert to pixels for BenjaminMap
  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        const height = parent.getBoundingClientRect().height;
        if (height > 0) {
          setMapHeight(`${Math.floor(height)}px`);
        }
      }
    }
  }, []);

  // Support both { latitude, longitude } and { lat, lng }
  const selectedLat =
    (selectedAddress as any)?.latitude ?? (selectedAddress as any)?.lat;
  const selectedLng =
    (selectedAddress as any)?.longitude ?? (selectedAddress as any)?.lng;

  const center = useMemo(() => {
    // 1) Selected address coordinates
    if (selectedLat && selectedLng) {
      return {
        lat: selectedLat,
        lng: selectedLng,
      };
    }

    // 2) Customer's live location
    if (location) {
      return location;
    }

    // 3) Fallback to Miami
    return { lat: 25.7617, lng: -80.1918 };
  }, [selectedLat, selectedLng, location]);

  const showAddressMarker = Boolean(selectedLat && selectedLng);
  const showCustomerMarker = !showAddressMarker && !isLoading && Boolean(location);

  return (
    <div 
      ref={containerRef}
      className={cn("w-full h-full", className)}
      style={{ 
        height: "100%",
        display: "block", // NOT flex
        overflow: "visible", // NOT hidden
      }}
    >
      <BenjaminMap
        center={center}
        customerPosition={showAddressMarker || showCustomerMarker ? center : undefined}
        zoom={14}
        height={mapHeight} // Use measured pixel height, not "100%"
      />
    </div>
  );
};

export default CustomerMap;
