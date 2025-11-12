/**
 * useCustomerLocation Hook
 * 
 * Gets the customer's current location using the browser's geolocation API.
 * Falls back to Miami coordinates if permission is denied or unavailable.
 */

import { useEffect, useState } from "react";

type Location = {
  lat: number;
  lng: number;
};

const FALLBACK_LOCATION: Location = {
  lat: 25.7617, // Miami fallback for laptops / denied permission
  lng: -80.1918,
};

export function useCustomerLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocation(FALLBACK_LOCATION);
      setIsLoading(false);
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLoading(false);
      },
      () => {
        // denied or error → use fallback so devs can still test
        setLocation(FALLBACK_LOCATION);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return { location, isLoading };
}

