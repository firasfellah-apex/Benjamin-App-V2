/**
 * GoogleMapsProvider Component
 * 
 * Singleton provider for Google Maps API using useJsApiLoader.
 * Ensures there is only one script loader to prevent race conditions.
 * All map components should use useGoogleMapsReady() hook to check if Maps is ready.
 * Uses runtime environment selector to get the correct API key per app.
 * 
 * Prevents "LoadScript has been reloaded unintentionally" warning by:
 * - Using stable constants for libraries and script ID
 * - Ensuring libraries array is not recreated on each render
 * - Maintaining a single global script loader
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { getEnv } from '@/lib/env';

// Stable constants outside component to prevent reload warnings
const GMAPS_LIBS = ['places'] as const;
const SCRIPT_ID = 'benjamin-gmaps-script';

type GoogleMapsContextValue = { 
  isReady: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue>({ 
  isReady: false 
});

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  // Get API key from runtime env selector (customer/runner/admin)
  const E = getEnv();
  const apiKey = E.GOOGLE_MAPS_API_KEY;

  // Memoize loader config to prevent unnecessary reloads
  const loaderConfig = useMemo(() => ({
    id: SCRIPT_ID,
    googleMapsApiKey: apiKey || '',
    libraries: GMAPS_LIBS as unknown as string[],
  }), [apiKey]);

  const { isLoaded } = useJsApiLoader(loaderConfig);

  const value = useMemo(() => ({ isReady: !!isLoaded }), [isLoaded]);

  // If no API key, still provide context but isReady will be false
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn(
        '[GoogleMapsProvider] Google Maps API key not found for current app. Maps features will be unavailable.'
      );
    }
    return (
      <GoogleMapsContext.Provider value={{ isReady: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // Optional: show a tiny skeleton to avoid layout shift
  if (!value.isReady) {
    return (
      <GoogleMapsContext.Provider value={value}>
        <div className="w-full h-full bg-slate-50" />
      </GoogleMapsContext.Provider>
    );
  }

  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
}

/**
 * Hook to check if Google Maps is ready
 * 
 * Returns an object with `isReady` boolean indicating if Google Maps API is loaded.
 * This is a stable hook export that never changes shape to prevent Fast Refresh issues.
 * 
 * Usage:
 * ```tsx
 * const { isReady } = useGoogleMapsReady();
 * if (!isReady) return <Loading />;
 * ```
 */
export function useGoogleMapsReady(): { isReady: boolean } {
  return useContext(GoogleMapsContext);
}
