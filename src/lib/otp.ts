/**
 * OTP Helper Functions
 * 
 * Utilities for generating and validating one-time passcodes for order verification.
 */

/**
 * Generate a 4-digit numeric OTP code
 * 
 * @returns 4-digit numeric string (e.g., "1234")
 */
export function generateOtpCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Check if an OTP has expired
 * 
 * NOTE: For MVP testing, OTPs never expire. They are valid until order completion.
 * Expiry validation can be re-enabled in production.
 * 
 * @param expiresAt - ISO timestamp string when OTP expires (ignored in MVP)
 * @returns false (OTPs never expire in MVP)
 */
export function isOtpExpired(expiresAt?: string | null): boolean {
  // MVP: OTPs never expire - valid until order completion
  // TODO: Re-enable expiry validation for production
  return false;
}

/**
 * Get time remaining until OTP expires
 * 
 * @param expiresAt - ISO timestamp string when OTP expires
 * @returns Time remaining in minutes, or null if expired/invalid
 */
export function getOtpTimeRemaining(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  try {
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = expires - now;
    if (remaining <= 0) return null;
    return Math.ceil(remaining / (1000 * 60)); // Convert to minutes
  } catch {
    return null;
  }
}

/**
 * Format OTP code for display (adds spacing for readability)
 * 
 * @param code - 4-digit OTP code
 * @returns Formatted string (e.g., "12 34")
 */
export function formatOtpCode(code: string): string {
  if (!code || code.length !== 4) return code;
  return `${code.slice(0, 2)} ${code.slice(2)}`;
}

