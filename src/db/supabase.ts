import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Supabase client singleton
 * Uses runtime environment selector from @/lib/env
 * Automatically selects keys based on current route (customer/runner/admin)
 * 
 * DO NOT create new clients in components/hooks
 * Always import and use this singleton instance
 * 
 * Environment variables required (prefixed by app):
 * - VITE_CUSTOMER_SUPABASE_URL / VITE_RUNNER_SUPABASE_URL / VITE_ADMIN_SUPABASE_URL
 * - VITE_CUSTOMER_SUPABASE_ANON_KEY / VITE_RUNNER_SUPABASE_ANON_KEY / VITE_ADMIN_SUPABASE_ANON_KEY
 */
const E = getEnv();
export const supabase = createClient(E.SUPABASE_URL, E.SUPABASE_ANON_KEY);

// Dev-only: Warn if env vars are missing
if (import.meta.env.DEV) {
  if (!E.SUPABASE_URL || !E.SUPABASE_ANON_KEY) {
    console.error(
      "[Supabase] Missing required environment variables for current app:\n" +
      `  - SUPABASE_URL: ${E.SUPABASE_URL ? '✓' : '✗'}\n` +
      `  - SUPABASE_ANON_KEY: ${E.SUPABASE_ANON_KEY ? '✓' : '✗'}\n\n` +
      "Please check your .env.local file and ensure the app-specific keys are set."
    );
  }
}
