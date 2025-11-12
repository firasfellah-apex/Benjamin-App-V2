import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { LocationProvider } from "./contexts/LocationContext";
import { GoogleMapsProvider } from "./components/maps/GoogleMapsProvider";
import { queryClient } from "./lib/queryClient";

console.log(
  "MAP KEY PRESENT?",
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? "YES" : "NO"
);


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <AppWrapper>
          <AuthProvider>
            <ProfileProvider>
              <LocationProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </LocationProvider>
            </ProfileProvider>
          </AuthProvider>
        </AppWrapper>
      </GoogleMapsProvider>
    </QueryClientProvider>
  </StrictMode>
);
