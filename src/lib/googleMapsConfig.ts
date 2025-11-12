/**
 * Google Maps Configuration
 * 
 * Shared configuration for Google Maps API.
 * Ensures libraries array is stable (not recreated on each render).
 */

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const GOOGLE_MAPS_LIBRARIES = ["places"] as const;

