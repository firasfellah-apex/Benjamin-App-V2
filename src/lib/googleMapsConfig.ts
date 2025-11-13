/**
 * Google Maps Configuration
 * 
 * Shared configuration for Google Maps API.
 * Uses runtime environment selector to get the correct API key per app.
 * Ensures libraries array is stable (not recreated on each render).
 */

import { getEnv } from './env';

// Get API key from runtime env selector (customer/runner/admin)
export const GOOGLE_MAPS_API_KEY = getEnv().GOOGLE_MAPS_API_KEY;

export const GOOGLE_MAPS_LIBRARIES = ["places"] as const;

