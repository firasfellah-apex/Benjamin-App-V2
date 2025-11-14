/// <reference path="../../global.d.ts" />

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";

export type LatLngLiteral = { lat: number; lng: number };

export interface BenjaminMapProps {
  center: LatLngLiteral;
  zoom?: number;
  height?: string;
  className?: string;
}

export function BenjaminMap({
  center,
  zoom = 15,
  height = "220px",
  className,
}: BenjaminMapProps) {
  const { isReady, isError } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const g = (window as any).google as typeof google | undefined;

    console.log("[BenjaminMap DEBUG]", {
      isReady,
      isError,
      hasWindowGoogle: !!g,
      hasMapsNamespace: !!g?.maps,
      mapCtorType: typeof g?.maps?.Map,
      height: mapDivRef.current?.offsetHeight,
    });

    if (!isReady || !g?.maps || !mapDivRef.current) return;

    const MapCtor = g.maps.Map as any;
    if (typeof MapCtor !== "function") {
      console.error("[BenjaminMap DEBUG] google.maps.Map is NOT a constructor");
      return;
    }

    // Just create once – no fancy ref tracking
    if (!mapInstanceRef.current) {
      console.log("[BenjaminMap DEBUG] creating map instance", {
        center,
        zoom,
      });

      mapInstanceRef.current = new MapCtor(mapDivRef.current, {
        center,
        zoom,
        disableDefaultUI: true,
      });
    } else {
      // Update existing map
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom ?? 15);
    }

    // no marker, no extra stuff for now

    return () => {
      // let GC take care
    };
  }, [isReady, center.lat, center.lng, zoom, isError]);

  const showSkeleton =
    !isReady ||
    isError ||
    !(window as any).google?.maps;

  return (
    <div
      className={cn("w-full", className)}
      style={{ minHeight: height }}
    >
      <div
        ref={mapDivRef}
        className="w-full h-full"
        style={{ height, background: "#e5e7eb", position: "relative" }}
      >
        {/* quick label so you know this div is there */}
        <div
          style={{
            position: "absolute",
            left: 4,
            bottom: 4,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            fontSize: 10,
            padding: "2px 4px",
            borderRadius: 4,
            zIndex: 10,
          }}
        >
          BenjaminMap container
        </div>

        {showSkeleton && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(209,213,219,0.85)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Loading map…
          </div>
        )}
      </div>
    </div>
  );
}

BenjaminMap.displayName = "BenjaminMap";

export default BenjaminMap;
