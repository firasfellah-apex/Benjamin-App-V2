/**
 * RequestFlowMapLayer Component
 * 
 * Map layer that lives between the top sheet and bottom bar.
 * Dynamically fills the space and centers on the selected address.
 * Uses ResizeObserver to adjust when top/bottom panels resize.
 */

import { useEffect, useRef, useState } from "react";
import { BenjaminMap } from "@/components/maps/BenjaminMap";

export interface RequestFlowMapLayerProps {
  lat?: number;
  lng?: number;
  label?: string;
}

const DEFAULT_CENTER = { lat: 25.7617, lng: -80.1918 }; // Miami fallback

export function RequestFlowMapLayer({ lat, lng, label }: RequestFlowMapLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapDimensions, setMapDimensions] = useState({
    top: 200,
    height: 400,
  });

  useEffect(() => {
    const updateDimensions = () => {
      requestAnimationFrame(() => {
        const topSheet = document.querySelector('[data-request-flow-top-sheet]') as HTMLElement;
        const bottomBar = document.querySelector('[data-request-flow-bottom-bar]') as HTMLElement;
        const viewportHeight = window.innerHeight;
        const minHeight = 200;

        let top = 200; // Default fallback
        let height = 400; // Default fallback

        // Get top sheet bottom position
        if (topSheet) {
          const rect = topSheet.getBoundingClientRect();
          if (rect.height > 0 && rect.bottom > 0) {
            top = rect.bottom;
          }
        }

        // Get bottom bar top position and calculate height
        if (bottomBar) {
          const rect = bottomBar.getBoundingClientRect();
          if (rect.height > 0 && rect.top > 0) {
            const availableHeight = rect.top - top;
            if (availableHeight > minHeight) {
              height = availableHeight;
            } else {
              // Not enough space - use minimum and adjust
              height = minHeight;
              if (rect.top - minHeight > 64) {
                top = rect.top - minHeight - 10;
              }
            }
          }
        } else {
          // No bottom bar - fill to viewport bottom
          height = Math.max(viewportHeight - top - 20, minHeight);
        }

        // Validate dimensions
        top = Math.max(64, Math.min(top, viewportHeight - minHeight - 20));
        height = Math.max(minHeight, Math.min(height, viewportHeight - top - 20));

        setMapDimensions({ top, height });

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[RequestFlowMapLayer] Updated:', {
            top,
            height,
            viewportHeight,
            topSheetFound: !!topSheet,
            bottomBarFound: !!bottomBar,
          });
        }
      });
    };

    // Initial update with multiple attempts to catch DOM changes
    updateDimensions();
    const t1 = setTimeout(updateDimensions, 50);
    const t2 = setTimeout(updateDimensions, 200);
    const t3 = setTimeout(updateDimensions, 500);

    // Event listeners
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);

    // ResizeObserver for top sheet and bottom bar
    let resizeObserver: ResizeObserver | null = null;
    const setupObserver = () => {
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(updateDimensions);
        const topSheet = document.querySelector('[data-request-flow-top-sheet]');
        const bottomBar = document.querySelector('[data-request-flow-bottom-bar]');
        if (topSheet) resizeObserver.observe(topSheet);
        if (bottomBar) resizeObserver.observe(bottomBar);
      }
    };

    setupObserver();
    const observerTimeout = setTimeout(setupObserver, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(observerTimeout);
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
      resizeObserver?.disconnect();
    };
  }, []);

  // Use provided coordinates or fallback
  const center = (lat && lng) ? { lat, lng } : DEFAULT_CENTER;

  // Debug: Log dimensions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RequestFlowMapLayer] Dimensions:', mapDimensions);
    }
  }, [mapDimensions]);

  // Always ensure valid, visible dimensions
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const safeTop = Math.max(64, Math.min(mapDimensions.top || 200, viewportHeight - 250));
  const safeHeight = Math.max(200, Math.min(mapDimensions.height || 400, viewportHeight - safeTop - 100));

  // Debug: Log what we're rendering
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RequestFlowMapLayer] Rendering map:', {
        safeTop,
        safeHeight,
        center,
        hasLabel: !!label,
        containerRef: !!containerRef.current,
      });
    }
  }, [safeTop, safeHeight, center, label]);

  return (
    <div
      ref={containerRef}
      className="fixed left-0 right-0 z-20 flex justify-center"
      style={{
        top: `${safeTop}px`,
        height: `${safeHeight}px`,
        minHeight: '200px',
        backgroundColor: '#e5e7eb',
        zIndex: 20, // Ensure it's above background but below top/bottom bars
      }}
      data-testid="request-flow-map-layer"
    >
      <div 
        className="w-full max-w-md h-full"
        style={{ 
          minHeight: '200px',
          position: 'relative',
        }}
      >
        <BenjaminMap
          center={center}
          customerPosition={center}
          zoom={17}
          showGoogleLogo
          height={`${safeHeight}px`}
          fallback={
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ 
                minHeight: '200px',
                backgroundColor: '#dbeafe',
                border: '2px dashed #3b82f6',
                borderRadius: '8px',
              }}
            >
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                {label && (
                  <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
                )}
                <p className="text-sm text-gray-600 font-medium">
                  {lat && lng ? "📍 Delivery location" : "🗺️ Map"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {lat && lng ? "Loading..." : "Select address"}
                </p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

