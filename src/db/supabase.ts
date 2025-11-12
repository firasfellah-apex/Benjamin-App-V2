import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client singleton
 * Uses validated environment variables from @/lib/env
 * 
 * DO NOT create new clients in components/hooks
 * Always import and use this singleton instance
 * 
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Dev-only: Warn if env vars are missing (env.ts already validates, but add explicit check)
if (import.meta.env.DEV) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.error(
      "[Supabase] Missing required environment variables:\n" +
      "  - VITE_SUPABASE_URL\n" +
      "  - VITE_SUPABASE_ANON_KEY\n\n" +
      "Please check your .env file and ensure these are set."
    );
  }
}
