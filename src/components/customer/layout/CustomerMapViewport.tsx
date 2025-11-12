/**
 * CustomerMapViewport Component
 * 
 * Map viewport that fills the space between top shell and bottom bar.
 * Uses flex-1 to automatically adjust when top/bottom heights change.
 * Includes smooth fade transitions when center changes.
 * Shows live user location when available.
 */

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BenjaminMap } from "@/components/map/BenjaminMap";
import { useLocation } from "@/contexts/LocationContext";

interface CustomerMapViewportProps {
  center: { lat: number; lng: number } | null; // usually live-location or selected address
  children?: React.ReactNode; // optional overlay later
}

const FALLBACK_CENTER = { lat: 25.7617, lng: -80.1918 }; // Miami

export const CustomerMapViewport = React.memo(function CustomerMapViewport({ center, children }: CustomerMapViewportProps) {
  const mapCenter = useMemo(() => center || FALLBACK_CENTER, [center]);
  const [mapKey, setMapKey] = useState(0);
  const [prevCenter, setPrevCenter] = useState(mapCenter);
  const { location: liveLocation } = useLocation();

  // Detect center changes and trigger smooth transition
  useEffect(() => {
    if (
      prevCenter.lat !== mapCenter.lat ||
      prevCenter.lng !== mapCenter.lng
    ) {
      setMapKey((prev) => prev + 1);
      setPrevCenter(mapCenter);
    }
  }, [mapCenter.lat, mapCenter.lng, prevCenter]);

  return (
    <div className="h-full w-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={mapKey}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.7 }}
          transition={{
            duration: 0.5,
            ease: "easeInOut",
          }}
          className="h-full w-full"
        >
          <BenjaminMap
            center={mapCenter}
            customerPosition={liveLocation || undefined}
            zoom={14}
            height="100%"
          />
        </motion.div>
      </AnimatePresence>
      {children}
    </div>
  );
});

