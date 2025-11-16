/**
 * Feature flags for Benjamin app
 * 
 * Use these flags to enable/disable features without code changes.
 */

/**
 * GPS Location Guardrail
 * 
 * When enabled, validates that the selected delivery address is within
 * a reasonable distance from the user's live GPS location.
 * 
 * Currently disabled - no distance validation is enforced.
 */
export const ENABLE_LOCATION_GUARDRAIL = false;

