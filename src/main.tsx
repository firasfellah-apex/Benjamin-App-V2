import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import * as Sentry from '@sentry/react';
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
import { initSentry } from "./lib/sentry";
import { initializePushNotifications } from "./lib/pushNotifications";
import { ToasterPortal } from "@/components/ui/ToasterPortal";

// Initialize Sentry error tracking (must be before React render)
initSentry();

// Initialize push notifications (native platforms only)
// Determine app role from URL path (customer, runner, or admin)
const activeApp = typeof window !== 'undefined' 
  ? (window.location.pathname.split('/')[1] || 'customer')
  : 'customer';
const appRole = (activeApp === 'runner' ? 'runner' : 'customer') as 'customer' | 'runner';
initializePushNotifications(appRole);

// Debug log: show active env profile
if (typeof window !== 'undefined') {
  const activeApp = window.location.pathname.split('/')[1] || 'customer';
  const env = getEnv();
  console.log('[ENV] active profile:', activeApp, env);
}


// Wrap app with Sentry error boundary
const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, resetError }: { error: Error; resetError: () => void }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try reloading the app.
        </p>
        <button
          onClick={resetError}
          className="w-full bg-black text-white hover:bg-black/90 rounded-full py-3 px-6"
        >
          Reload App
        </button>
      </div>
    </div>
  ),
  showDialog: false,
});

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
                    <SentryApp />
                  </TopShelfHeightProvider>
                </BrowserRouter>
              </LocationProvider>
            </ProfileProvider>
          </AuthProvider>
        </AppWrapper>
      </GoogleMapsProvider>
    </QueryClientProvider>
    {/* Toaster portaled to document.body - completely layout-neutral */}
    <ToasterPortal />
  </StrictMode>
);

// Initialize Capacitor (native app features)
if (Capacitor.isNativePlatform()) {
  // Set status bar style
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {
    // Ignore if not available
  });
  
  // Hide splash screen after app loads
  SplashScreen.hide().catch(() => {
    // Ignore if not available
  });
}

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
