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
  draggable?: boolean; // If true, marker can be dragged
  onMarkerDrag?: (position: LatLngLiteral) => void; // Callback when marker is dragged
}

export function BenjaminMap({
  center,
  zoom = 15,
  className,
  marker,
  minimal = false,
  draggable = false,
  onMarkerDrag,
}: BenjaminMapProps) {
  const { isReady, isError } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dragListenerRef = useRef<any>(null);

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
        zoomControl: true, // Enable zoom controls
        zoomControlOptions: {
          position: g.maps.ControlPosition.RIGHT_CENTER,
        },
      };

      if (minimal && minimalStyles.length > 0) {
        mapOptions.styles = minimalStyles;
      }

      mapInstanceRef.current = new MapCtor(mapDivRef.current, mapOptions);
    } else {
      // Update existing map
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom ?? 15);
      
      // Update zoom controls
      mapInstanceRef.current.setOptions({
        zoomControl: true,
        zoomControlOptions: {
          position: g.maps.ControlPosition.RIGHT_CENTER,
        },
      });
      
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
          // Update existing marker position only if it changed externally
          const currentPos = markerRef.current.getPosition();
          if (!currentPos || 
              Math.abs(currentPos.lat() - marker.lat) > 0.0001 || 
              Math.abs(currentPos.lng() - marker.lng) > 0.0001) {
            markerRef.current.setPosition({ lat: marker.lat, lng: marker.lng });
          }
          // Update draggable state
          markerRef.current.setDraggable(draggable);
          
          // Remove old drag listener if it exists
          if (dragListenerRef.current) {
            g.maps.event.removeListener(dragListenerRef.current);
            dragListenerRef.current = null;
          }
          
          // Add dragend listener if draggable and callback provided
          if (draggable && onMarkerDrag) {
            dragListenerRef.current = markerRef.current.addListener('dragend', () => {
              const position = markerRef.current.getPosition();
              if (position && onMarkerDrag) {
                onMarkerDrag({
                  lat: position.lat(),
                  lng: position.lng(),
                });
              }
            });
          }
          
          // Ensure map centers on marker
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        } else {
          // Create new marker with green pin icon
          markerRef.current = new MarkerCtor({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstanceRef.current,
            draggable: draggable,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C10.477 0 6 4.477 6 10C6 17.5 16 40 16 40C16 40 26 17.5 26 10C26 4.477 21.523 0 16 0Z" fill="#22C55E"/>
                  <circle cx="16" cy="10" r="5" fill="white"/>
                </svg>
              `),
              scaledSize: new g.maps.Size(32, 40),
              anchor: new g.maps.Point(16, 40),
            },
          });
          
          // Add dragend listener if draggable and callback provided
          if (draggable && onMarkerDrag) {
            dragListenerRef.current = markerRef.current.addListener('dragend', () => {
              const position = markerRef.current.getPosition();
              if (position && onMarkerDrag) {
                onMarkerDrag({
                  lat: position.lat(),
                  lng: position.lng(),
                });
              }
            });
          }
          
          // Ensure map centers on marker when it's first created
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: marker.lat, lng: marker.lng });
          }
        }
      }
    } else {
      // Remove marker if marker prop is null/undefined
      if (markerRef.current) {
        // Remove drag listener
        if (dragListenerRef.current && g?.maps?.event) {
          g.maps.event.removeListener(dragListenerRef.current);
          dragListenerRef.current = null;
        }
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
      if (dragListenerRef.current && g?.maps?.event) {
        g.maps.event.removeListener(dragListenerRef.current);
        dragListenerRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [isReady, center.lat, center.lng, zoom, isError, marker?.lat, marker?.lng, minimal, draggable, onMarkerDrag]);

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
