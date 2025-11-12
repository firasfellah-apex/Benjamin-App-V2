/**
 * LocationContext
 * 
 * Provides customer's live location for map centering.
 * Non-blocking: falls back gracefully if geolocation is denied/unavailable.
 */

import React, { createContext, useContext, useEffect, useState } from "react";

type Location = {
  lat: number;
  lng: number;
} | null;

interface LocationContextValue {
  location: Location;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  location: null,
  isLoading: true,
});

const FALLBACK_LOCATION: Location = {
  lat: 25.7617, // Miami/Brickell
  lng: -80.1918,
};

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<Location>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[LocationContext] Geolocation not available, using fallback');
      }
      setLocation(FALLBACK_LOCATION);
      setIsLoading(false);
      return;
    }

    // Get location once on mount (non-blocking)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLoading(false);
      },
      () => {
        // Permission denied or error - use fallback
        if (process.env.NODE_ENV === 'development') {
          console.info('[LocationContext] Geolocation denied/unavailable, using fallback');
        }
        setLocation(FALLBACK_LOCATION);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000, // 5 minutes
        timeout: 10000, // 10 seconds
      }
    );
  }, []);

  return (
    <LocationContext.Provider value={{ location, isLoading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

