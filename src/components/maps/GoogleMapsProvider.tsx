/**
 * GoogleMapsProvider Component
 * 
 * Singleton provider for Google Maps API.
 * Loads the Maps script once at the app root.
 * All map components should assume Maps is available via this provider.
 * 
 * Prevents duplicate script loading that causes "Element already defined" errors.
 */

import React, { useEffect, useState, useRef, createContext, useContext } from "react";
import { LoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMapsConfig";

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

// Context to track when Google Maps is ready
interface GoogleMapsContextValue {
  isMapsReady: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isMapsReady: false,
});

export function useGoogleMapsReady() {
  return useContext(GoogleMapsContext);
}

// Global flag to track if script is loaded (module-level, persists across remounts)
let scriptLoaded = false;
let isInitializing = false;

// Check if Google Maps is already available
function isGoogleMapsLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Primary check: google.maps must be available
  if ((window as any).google?.maps) {
    return true;
  }
  
  // Secondary check: script tag exists AND has loaded (not just present)
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement | null;
  if (existingScript) {
    // Only return true if the script has actually loaded (google.maps exists)
    // Don't rely on script tag existence alone - it might still be loading
    return !!(window as any).google?.maps;
  }
  
  return false;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const hasRenderedRef = useRef(false);
  const [isReady, setIsReady] = useState(() => {
    // Check on initial render
    const alreadyLoaded = isGoogleMapsLoaded();
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoogleMapsProvider] Initial check:', {
        alreadyLoaded,
        hasGoogleMaps: !!(window as any).google?.maps,
        hasScriptTag: !!document.querySelector('script[src*="maps.googleapis.com"]'),
        scriptLoaded,
        isInitializing,
      });
    }
    if (alreadyLoaded) {
      scriptLoaded = true;
      return true;
    }
    return false;
  });

  const [mapsReady, setMapsReady] = useState(() => {
    return typeof window !== 'undefined' && !!(window as any).google?.maps;
  });

  useEffect(() => {
    // Double-check on mount
    if (isGoogleMapsLoaded()) {
      scriptLoaded = true;
      setIsReady(true);
      setMapsReady(true);
    }
  }, []);

  // Poll for Maps availability after LoadScript's onLoad fires
  useEffect(() => {
    if (mapsReady) return;

    // Check if Maps is ready
    const checkMaps = () => {
      if ((window as any).google?.maps) {
        setMapsReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkMaps()) return;

    // Poll every 100ms for up to 5 seconds
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (checkMaps() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mapsReady, isReady]);

  // If no API key, render children without Maps
  if (!GOOGLE_MAPS_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[GoogleMapsProvider] VITE_GOOGLE_MAPS_API_KEY not found. Maps features will be unavailable."
      );
    }
    return (
      <GoogleMapsContext.Provider value={{ isMapsReady: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // If script already loaded, just render children (don't use LoadScript)
  if (scriptLoaded || isReady) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoogleMapsProvider] Script already loaded, skipping LoadScript');
    }
    return (
      <GoogleMapsContext.Provider value={{ isMapsReady: mapsReady }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // Prevent multiple LoadScript instances from rendering
  // BUT: Only if we've actually rendered LoadScript before
  // Reset the flag if script failed to load
  if (hasRenderedRef.current && isInitializing) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoogleMapsProvider] Already initializing, waiting for LoadScript...', {
        hasRenderedRef: hasRenderedRef.current,
        isInitializing,
      });
    }
    return (
      <GoogleMapsContext.Provider value={{ isMapsReady: mapsReady }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // Double-check one more time before initializing
  if (isGoogleMapsLoaded()) {
    scriptLoaded = true;
    setIsReady(true);
    setMapsReady(true);
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoogleMapsProvider] Maps already loaded, skipping LoadScript');
    }
    return (
      <GoogleMapsContext.Provider value={{ isMapsReady: true }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // Mark as initializing to prevent concurrent loads
  // BUT: Only set hasRenderedRef AFTER LoadScript actually mounts
  isInitializing = true;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[GoogleMapsProvider] ✅ Rendering LoadScript', {
      apiKey: GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing',
      hasRenderedRef: hasRenderedRef.current,
      isInitializing,
    });
  }

  return (
    <GoogleMapsContext.Provider value={{ isMapsReady: mapsReady }}>
      <LoadScript
        id="google-maps-script-loader"
        key="google-maps-loader-singleton" // Stable key to prevent remounts
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={[...GOOGLE_MAPS_LIBRARIES]}
        preventGoogleFontsLoading={true}
        loadingElement={<div />} // Minimal loading element
        onLoad={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[GoogleMapsProvider] ✅ LoadScript onLoad fired');
          }
          scriptLoaded = true;
          setIsReady(true);
          isInitializing = false;
          hasRenderedRef.current = true;
          // Give Maps a moment to fully initialize
          setTimeout(() => {
            if ((window as any).google?.maps) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[GoogleMapsProvider] ✅ window.google.maps is now available');
              }
              setMapsReady(true);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[GoogleMapsProvider] ⚠️ onLoad fired but window.google.maps not yet available, will poll...');
              }
            }
          }, 100);
        }}
        onError={(error) => {
          console.error('[GoogleMapsProvider] ❌ Failed to load Google Maps:', error);
          scriptLoaded = false;
          setIsReady(false);
          hasRenderedRef.current = false;
          isInitializing = false;
        }}
      >
        {children}
      </LoadScript>
    </GoogleMapsContext.Provider>
  );
}

