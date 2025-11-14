import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { LocationProvider } from "./contexts/LocationContext";
import { GoogleMapsProvider } from "./components/maps/GoogleMapsProvider";
import { TopShelfHeightProvider } from "./components/customer/layout/TopShelfHeight";
import { queryClient } from "./lib/queryClient";
import { getEnv } from "./lib/env";

// Debug log: show active env profile
if (typeof window !== 'undefined') {
  const activeApp = window.location.pathname.split('/')[1] || 'customer';
  const env = getEnv();
  console.log('[ENV] active profile:', activeApp, env);
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <AppWrapper>
          <AuthProvider>
            <ProfileProvider>
              <LocationProvider>
                <BrowserRouter>
                  <TopShelfHeightProvider>
                    <App />
                  </TopShelfHeightProvider>
                </BrowserRouter>
              </LocationProvider>
            </ProfileProvider>
          </AuthProvider>
        </AppWrapper>
      </GoogleMapsProvider>
    </QueryClientProvider>
  </StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        console.warn('[SW] registration failed', err);
      });
  });
}
