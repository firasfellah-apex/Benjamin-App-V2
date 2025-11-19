/// <reference path="../../global.d.ts" />

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";

export type LatLngLiteral = { lat: number; lng: number };

export interface BenjaminMapProps {
  center: LatLngLiteral;
  zoom?: number;
  className?: string;
  marker?: LatLngLiteral | null; // Optional marker position
  minimal?: boolean; // If true, hide POI labels and reduce map features
}

export function BenjaminMap({
  center,
  zoom = 15,
  className,
  marker,
  minimal = false,
}: BenjaminMapProps) {
  const { isReady, isError } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const g = (window as any).google as any;

    console.log("[BenjaminMap DEBUG]", {
      isReady,
      isError,
      hasWindowGoogle: !!g,
      hasMapsNamespace: !!g?.maps,
      mapCtorType: typeof g?.maps?.Map,
    });

    if (!isReady || !g?.maps || !mapDivRef.current) return;

    const MapCtor = g.maps.Map as any;
    if (typeof MapCtor !== "function") {
      console.error("[BenjaminMap DEBUG] google.maps.Map is NOT a constructor");
      return;
    }

    // Minimal map styles - hide POI labels, reduce features
    const minimalStyles = minimal ? [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.attraction",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.place_of_worship",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.school",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.sports_complex",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "landscape",
        elementType: "geometry.fill",
        stylers: [{ color: "#f5f5f5" }],
      },
    ] : [];

    // Just create once – no fancy ref tracking
    if (!mapInstanceRef.current) {
      console.log("[BenjaminMap DEBUG] creating map instance", {
        center,
        zoom,
        minimal,
      });

      const mapOptions: any = {
        center,
        zoom,
        disableDefaultUI: true,
        keyboardShortcuts: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: false,
      };

      if (minimal && minimalStyles.length > 0) {
        mapOptions.styles = minimalStyles;
      }

      mapInstanceRef.current = new MapCtor(mapDivRef.current, mapOptions);
    } else {
      // Update existing map
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom ?? 15);
      
      // Update styles if minimal prop changed
      if (minimal && minimalStyles.length > 0) {
        mapInstanceRef.current.setOptions({ styles: minimalStyles });
      } else if (!minimal) {
        mapInstanceRef.current.setOptions({ styles: [] });
      }
    }

    // Handle marker
    if (marker && marker.lat && marker.lng) {
      const MarkerCtor = g.maps.Marker as any;
      if (typeof MarkerCtor === "function") {
        if (markerRef.current) {
          // Update existing marker position
          markerRef.current.setPosition({ lat: marker.lat, lng: marker.lng });
          // Ensure map centers on marker
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        } else {
          // Create new marker with green pin icon
          markerRef.current = new MarkerCtor({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstanceRef.current,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#22C55E", // Green color
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
          });
          // Ensure map centers on marker when it's first created
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        }
      }
    } else {
      // Remove marker if marker prop is null/undefined
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }

    // Always hide Google Maps attribution
    let hideAttributionTimeout: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;
    
    if (mapInstanceRef.current && mapDivRef.current) {
      const hideAttribution = () => {
        const mapContainer = mapDivRef.current;
        if (mapContainer) {
          // Hide attribution links
          const attributionLinks = mapContainer.querySelectorAll('a[href*="google.com"], a[href*="keyboard_shortcuts"]');
          attributionLinks.forEach((link: any) => {
            if (link.parentElement) {
              link.parentElement.style.display = 'none';
            }
          });
          
          // Hide copyright container and Google logo
          const copyrightContainers = mapContainer.querySelectorAll('.gm-style-cc, .gmnoprint, .gm-bundled-control, a[href*="google.com/maps"]');
          copyrightContainers.forEach((container: any) => {
            container.style.display = 'none';
          });

          // Hide the Google logo image
          const googleLogos = mapContainer.querySelectorAll('img[src*="google"], img[alt="Google"]');
          googleLogos.forEach((img: any) => {
            if (img.closest('.gm-style-cc') || img.closest('.gmnoprint')) {
              img.style.display = 'none';
            }
          });
        }
      };

      // Initial hide after map renders
      hideAttributionTimeout = setTimeout(hideAttribution, 500);

      // Use MutationObserver to hide attribution as it appears
      observer = new MutationObserver(() => {
        hideAttribution();
      });

      observer.observe(mapDivRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      // Clear attribution hiding timeout
      if (hideAttributionTimeout) {
        clearTimeout(hideAttributionTimeout);
      }
      // Disconnect observer
      if (observer) {
        observer.disconnect();
      }
      // Cleanup marker on unmount
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [isReady, center.lat, center.lng, zoom, isError, marker?.lat, marker?.lng, minimal]);

  const showSkeleton =
    !isReady ||
    isError ||
    !(window as any).google?.maps;

  return (
    <div
      className={cn("w-full h-full", className)}
      style={{ width: "100%", height: "100%" }}
    >
      <div
        ref={mapDivRef}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          background: "#e5e7eb",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Always hide Google Maps attribution and controls */}
          <style>{`
            .gm-style-cc,
            .gm-style-cc div,
            .gmnoprint,
            .gm-bundled-control,
            .gm-fullscreen-control,
            a[href*="google.com/maps"],
            a[href*="keyboard_shortcuts"],
          a[href*="terms_maps"],
          img[src*="google"][alt="Google"],
            .gm-style > div:last-child {
              display: none !important;
            }
          `}</style>

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
