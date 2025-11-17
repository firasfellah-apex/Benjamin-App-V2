import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getEnv } from "@/lib/env";

declare global {
  interface Window {
    __benjaminGoogleMapsPromise?: Promise<typeof google>;
  }
}

interface GoogleMapsContextValue {
  googleMaps: typeof google | null;
  isReady: boolean;
  isError: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue | undefined>(
  undefined
);

const SCRIPT_ID = "benjamin-google-maps-script";

async function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    throw new Error("loadGoogleMaps only in browser");
  }

  if (window.google?.maps) {
    return window.google as typeof google;
  }

  if (window.__benjaminGoogleMapsPromise) {
    return window.__benjaminGoogleMapsPromise;
  }

  window.__benjaminGoogleMapsPromise = new Promise<typeof google>(
    (resolve, reject) => {
      const existing = document.getElementById(
        SCRIPT_ID
      ) as HTMLScriptElement | null;

      const hookUp = (script: HTMLScriptElement) => {
        script.onload = () => {
          script.setAttribute("data-loaded", "true");
          if ((window as any).google?.maps) {
            console.log("[GoogleMapsProvider] Maps API loaded (classic loader)");
            resolve((window as any).google as typeof google);
          } else {
            console.error("[GoogleMapsProvider] Maps API loaded but google.maps missing");
            reject(new Error("google.maps not available after load"));
          }
        };
        script.onerror = () =>
          reject(new Error("Failed to load Google Maps script"));
      };

      if (existing) {
        if (
          existing.getAttribute("data-loaded") === "true" ||
          window.google?.maps
        ) {
          if (window.google?.maps) {
            resolve(window.google as typeof google);
          } else {
            hookUp(existing);
          }
        } else {
          hookUp(existing);
        }
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;

      hookUp(script);
      document.head.appendChild(script);
    }
  );

  return window.__benjaminGoogleMapsPromise;
}

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [googleMaps, setGoogleMaps] = useState<typeof google | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already loaded
    if (window.google?.maps) {
      setGoogleMaps(window.google as typeof google);
      setIsReady(true);
      setIsError(false);
      return;
    }

    const { GOOGLE_MAPS_API_KEY } = getEnv();
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("[GoogleMapsProvider] No GOOGLE_MAPS_API_KEY in env");
      setGoogleMaps(null);
      setIsReady(false);
      setIsError(true);
      return;
    }

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((gm) => {
        setGoogleMaps(gm);
        setIsReady(true);
        setIsError(false);
      })
      .catch((err) => {
        console.error("[GoogleMapsProvider] Failed to load:", err);
        setGoogleMaps(null);
        setIsReady(false);
        setIsError(true);
      });
  }, []);

  return (
    <GoogleMapsContext.Provider
      value={{
        googleMaps,
        isReady,
        isError,
      }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps(): GoogleMapsContextValue {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) {
    throw new Error("useGoogleMaps must be used within GoogleMapsProvider");
  }
  return ctx;
}

export function useGoogleMapsReady(): boolean {
  return useGoogleMaps().isReady;
}

export default GoogleMapsProvider;
