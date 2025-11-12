/**
 * CustomerMap Component
 * 
 * Centralized map wrapper for customer screens.
 * Handles focal point logic (center on user, address, runner, etc.)
 * No business logic - just visual presentation.
 */

import React, { useRef, useEffect, useState } from "react";
import { BenjaminMap } from "@/components/map/BenjaminMap";

export type MarkerType = "user" | "address" | "runner" | "none";

interface CustomerMapProps {
  /** Focal point of the map - always rendered at visual center */
  center: { lat: number; lng: number };
  /** Visual marker type (affects icon/label) */
  markerType?: MarkerType;
}

export function CustomerMap({ center, markerType = "none" }: CustomerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<string>("400px");

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

  // Determine customer position based on marker type
  const customerPosition = markerType !== "none" ? center : undefined;

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: '120px' }}>
      <BenjaminMap
        center={center}
        customerPosition={customerPosition}
        zoom={14}
        height={containerHeight}
      />
    </div>
  );
}

