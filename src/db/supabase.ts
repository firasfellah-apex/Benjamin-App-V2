import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client singleton
 * Uses validated environment variables from @/lib/env
 * 
 * DO NOT create new clients in components/hooks
 * Always import and use this singleton instance
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
