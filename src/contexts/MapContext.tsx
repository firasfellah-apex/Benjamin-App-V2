/**
 * Map Provider Context
 * 
 * Provides map functionality with fallback to static maps
 * - Default: Static map images (no external dependencies)
 * - Optional: Google Maps integration (if VITE_ENABLE_GOOGLE_MAPS=1)
 */

import { createContext, useContext, ReactNode } from 'react';

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
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
