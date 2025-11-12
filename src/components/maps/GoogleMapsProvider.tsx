/**
 * GoogleMapsProvider Component
 * 
 * Singleton provider for Google Maps API using useJsApiLoader.
 * Ensures there is only one script loader to prevent race conditions.
 * All map components should use useGoogleMapsReady() hook to check if Maps is ready.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsConfig';

type GoogleMapsContextValue = { 
  isReady: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue>({ 
  isReady: false 
});

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: 'gmaps-core',
    googleMapsApiKey: apiKey || '',
    libraries: [...GOOGLE_MAPS_LIBRARIES],
  });

  const value = useMemo(() => ({ isReady: !!isLoaded }), [isLoaded]);

  // If no API key, still provide context but isReady will be false
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[GoogleMapsProvider] VITE_GOOGLE_MAPS_API_KEY not found. Maps features will be unavailable.'
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

export function useGoogleMapsReady() {
  return useContext(GoogleMapsContext);
}
