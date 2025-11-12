/**
 * useLiveLocation Hook
 * 
 * Gets the customer's current location using the browser's geolocation API.
 * Falls back to default city center if permission is denied or unavailable.
 */

import { useEffect, useState } from "react";

type Location = {
  lat: number;
  lng: number;
};

const FALLBACK_LOCATION: Location = {
  lat: 25.7617, // Miami/Brickell fallback
  lng: -80.1918,
};

export function useLiveLocation() {
  const [center, setCenter] = useState<Location>(FALLBACK_LOCATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setCenter(FALLBACK_LOCATION);
      setIsLoading(false);
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLoading(false);
      },
      () => {
        // denied or error → use fallback so devs can still test
        setCenter(FALLBACK_LOCATION);
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

  return { center, isLoading };
}

