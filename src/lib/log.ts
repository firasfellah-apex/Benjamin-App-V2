/**
 * Logger Utility
 * 
 * Provides dev-only logging to reduce console noise in production.
 * Important warnings and errors should still use console.warn/error.
 */

export const log = {
  /**
   * Log only in development mode
   * Replaces noisy console.log calls that should not appear in production
   */
  dev: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
};

