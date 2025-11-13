/**
 * Map Provider Context
 * 
 * Provides map functionality with fallback to static maps
 * - Default: Static map images (no external dependencies)
 * - Optional: Google Maps integration (if VITE_ENABLE_GOOGLE_MAPS=1)
 * Uses runtime environment selector to get the correct API key per app.
 */

import { createContext, useContext, ReactNode } from 'react';
import { getEnv } from '@/lib/env';

interface MapContextValue {
  isGoogleMapsEnabled: boolean;
  googleMapsApiKey?: string;
}

const MapContext = createContext<MapContextValue>({
  isGoogleMapsEnabled: false
});

export function useMap() {
  return useContext(MapContext);
}

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const isGoogleMapsEnabled = import.meta.env.VITE_ENABLE_GOOGLE_MAPS === '1';
  // Get API key from runtime env selector (customer/runner/admin)
  const E = getEnv();
  const googleMapsApiKey = E.GOOGLE_MAPS_API_KEY;

  return (
    <MapContext.Provider
      value={{
        isGoogleMapsEnabled,
        googleMapsApiKey
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
