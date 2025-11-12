/**
 * BenjaminMap Component
 * 
 * Safe, production-ready wrapper around Google Maps.
 * Handles script loading, error states, and fallback UI.
 * 
 * Principles:
 * - Never blocks core flows if Maps fails
 * - Shows friendly fallback if API key missing or script fails
 * - Clean, minimal map UI (no unnecessary controls)
 * - Pure presentational component (no Supabase/API logic)
 */

import React, { useMemo, useState, useEffect } from 'react';
import { googleMapsApiKey, hasGoogleMaps } from '@/lib/env';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useGoogleMapsReady } from '@/components/maps/GoogleMapsProvider';

// Import Google Maps API components directly
// Vite will handle this as an ESM import
// Note: LoadScript is now provided by GoogleMapsProvider at app root
import { 
  GoogleMap, 
  Marker, 
  Polyline 
} from '@react-google-maps/api';

export interface MapPosition {
  lat: number;
  lng: number;
}

export interface BenjaminMapProps {
  /**
   * Center point of the map
   */
  center: MapPosition;
  
  /**
   * Optional runner position marker
   */
  runnerPosition?: MapPosition;
  
  /**
   * Optional customer position marker
   */
  customerPosition?: MapPosition;
  
  /**
   * Optional path to draw as a polyline
   */
  path?: MapPosition[];
  
  /**
   * Zoom level (default: 14)
   */
  zoom?: number;
  
  /**
   * Map height (default: '220px')
   */
  height?: string;
  
  /**
   * Custom fallback content to show if Maps is unavailable
   */
  fallback?: React.ReactNode;
  
  /**
   * Callback when map fails to load
   */
  onLoadError?: () => void;
}

const getDefaultMapOptions = (): any => ({
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
});

/**
 * Fallback UI shown when Maps is unavailable
 */
const DefaultFallback: React.FC<{ height?: string }> = ({ height = '220px' }) => (
  <Card className="bg-neutral-50 border border-neutral-200" style={{ height }}>
    <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
      <MapPin className="h-8 w-8 text-neutral-400 mb-3" />
      <p className="text-sm font-medium text-neutral-700 mb-1">
        Live map unavailable
      </p>
      <p className="text-xs text-neutral-500">
        You'll still see every update here.
      </p>
    </CardContent>
  </Card>
);

export const BenjaminMap: React.FC<BenjaminMapProps> = ({
  center,
  runnerPosition,
  customerPosition,
  path,
  zoom = 14,
  height = '220px',
  fallback,
  onLoadError,
}) => {
  // If no API key, show fallback immediately
  if (!hasGoogleMaps) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BenjaminMap] Google Maps API key not found. Showing fallback UI.');
    }
    return <>{fallback || <DefaultFallback height={height} />}</>;
  }

  // Map container styles
  // Remove border radius when height is 100% (used in customer flow where map tucks under top nav)
  const containerStyle = useMemo(
    () => ({
      width: '100%',
      height,
      borderRadius: height === '100%' ? '0' : '0.75rem',
      overflow: 'hidden',
    }),
    [height]
  );

  // Use context to check if Maps is ready (from GoogleMapsProvider)
  const { isMapsReady: contextMapsReady } = useGoogleMapsReady();
  
  // Also check directly as fallback
  const [mapsReady, setMapsReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasGoogleMaps = !!(window as any).google?.maps;
    if (hasGoogleMaps && process.env.NODE_ENV === 'development') {
      console.log('[BenjaminMap] Google Maps available on initial render');
    }
    return hasGoogleMaps;
  });

  // Combine context and direct check
  const isReady = contextMapsReady || mapsReady;

  // Update local state when context updates
  useEffect(() => {
    if (contextMapsReady && !mapsReady) {
      setMapsReady(true);
    }
  }, [contextMapsReady, mapsReady]);

  // Poll for Maps availability (LoadScript might still be loading)
  useEffect(() => {
    if (isReady || !hasGoogleMaps) return;

    // Helper to check if Maps is ready
    const checkMapsReady = (): boolean => {
      // Check if window.google.maps exists
      if ((window as any).google?.maps) {
        return true;
      }
      // Also check if script tag exists (indicates script is loading/loaded)
      const scriptTag = document.querySelector('script[src*="maps.googleapis.com"]');
      if (scriptTag && (scriptTag as HTMLScriptElement).src) {
        // Script tag exists, but Maps might not be ready yet
        return false;
      }
      return false;
    };

    // Check immediately
    if (checkMapsReady()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BenjaminMap] Google Maps detected immediately');
      }
      setMapsReady(true);
      return;
    }

    // Check if script tag exists
    const scriptTag = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!scriptTag && process.env.NODE_ENV === 'development') {
      console.warn('[BenjaminMap] Google Maps script tag not found in DOM');
      console.warn('[BenjaminMap] This might indicate LoadScript is not loading properly');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[BenjaminMap] Google Maps not ready, starting polling...');
    }

    // Poll every 100ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    const interval = setInterval(() => {
      attempts++;
      if (checkMapsReady()) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[BenjaminMap] ✅ Google Maps detected after ${attempts * 100}ms`);
        }
        setMapsReady(true);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        // Give up after 10 seconds
        clearInterval(interval);
        console.error('[BenjaminMap] ❌ Google Maps failed to load after 10 seconds');
        console.error('[BenjaminMap] Debug info:', {
          hasGoogleMaps,
          windowGoogle: !!(window as any).google,
          windowGoogleMaps: !!(window as any).google?.maps,
          scriptTagExists: !!document.querySelector('script[src*="maps.googleapis.com"]'),
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isReady, hasGoogleMaps]);

  // If Maps not ready, show loading state
  if (!isReady && hasGoogleMaps) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-neutral-50 border border-neutral-200"
      >
        <p className="text-sm text-neutral-500">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={getDefaultMapOptions()}
    >
      {/* Customer position marker (live location) */}
      {customerPosition && (
        <Marker
          position={customerPosition}
          icon={{
            path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
            scale: 10,
            fillColor: '#22C55E',
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          }}
          zIndex={1000}
        />
      )}

      {/* Runner position marker */}
      {runnerPosition && (
        <Marker
          position={runnerPosition}
          icon={{
            path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
            scale: 8,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }}
          label={{
            text: 'Runner',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '500',
          }}
        />
      )}

      {/* Path polyline */}
      {path && path.length > 1 && (
        <Polyline
          path={path}
          options={{
            strokeColor: '#3B82F6',
            strokeOpacity: 0.6,
            strokeWeight: 3,
            geodesic: true,
          }}
        />
      )}
    </GoogleMap>
  );
};

BenjaminMap.displayName = 'BenjaminMap';

