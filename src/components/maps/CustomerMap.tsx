/**
 * CustomerMap Component
 * 
 * Shared map component for customer screens.
 * Centers on selected address if provided, otherwise centers on customer's live location.
 * Falls back to Miami if no location is available.
 */

import React, { useMemo, useRef, useEffect, useState } from "react";
import { BenjaminMap } from "@/components/map/BenjaminMap";
import { useCustomerLocation } from "@/hooks/useCustomerLocation";
import type { CustomerAddress } from "@/types/types";

type CustomerMapProps = {
  selectedAddress?: CustomerAddress | null;
};

export function CustomerMap({ selectedAddress }: CustomerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<string>("400px");
  const { location, isLoading } = useCustomerLocation();

  // Measure container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        if (height > 0) {
          setContainerHeight(`${height}px`);
        }
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const center = useMemo(() => {
    // Priority 1: Selected address coordinates
    if (selectedAddress?.latitude && selectedAddress?.longitude) {
      return {
        lat: selectedAddress.latitude,
        lng: selectedAddress.longitude,
      };
    }

    // Priority 2: Customer's live location
    if (location) {
      return location;
    }

    // Priority 3: Fallback to Miami
    return { lat: 25.7617, lng: -80.1918 };
  }, [selectedAddress, location]);

  // Determine if we should show a marker
  // Show marker for selected address, or for customer location if no address is selected
  const showAddressMarker = selectedAddress?.latitude && selectedAddress?.longitude;
  const showCustomerMarker = !showAddressMarker && !isLoading && location;

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: '160px' }}>
      <BenjaminMap
        center={center}
        customerPosition={showAddressMarker || showCustomerMarker ? center : undefined}
        zoom={14}
        height={containerHeight}
      />
    </div>
  );
}

