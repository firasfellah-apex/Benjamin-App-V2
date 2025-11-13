import { z } from 'zod';

/**
 * Runtime Environment Selector
 * 
 * Selects environment variables based on the current route at runtime.
 * This allows switching between customer/runner/admin apps without rebuilding.
 * 
 * We keep ONE .env.local that contains THREE sets of vars.
 * Prefix each set to avoid collisions:
 * - CUSTOMER_* → used under /customer (default)
 * - RUNNER_*   → used under /runner
 * - ADMIN_*    → used under /admin
 */

type EnvBundle = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
};

function pickApp(): 'customer' | 'runner' | 'admin' {
  const path = (typeof window !== 'undefined' ? window.location.pathname : '') || '';
  
  if (path.startsWith('/runner')) return 'runner';
  if (path.startsWith('/admin')) return 'admin';
  
  return 'customer';
}

function readRaw(name: string, fallback = ''): string {
  const v = (import.meta as any).env?.[name];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/**
 * Get environment bundle for the current app based on route
 */
export function getEnv(): EnvBundle {
  const app = pickApp();
  
  if (app === 'runner') {
    return {
      SUPABASE_URL: readRaw('VITE_RUNNER_SUPABASE_URL'),
      SUPABASE_ANON_KEY: readRaw('VITE_RUNNER_SUPABASE_ANON_KEY'),
      GOOGLE_MAPS_API_KEY: readRaw('VITE_RUNNER_GOOGLE_MAPS_API_KEY'),
    };
  }
  
  if (app === 'admin') {
    return {
      SUPABASE_URL: readRaw('VITE_ADMIN_SUPABASE_URL'),
      SUPABASE_ANON_KEY: readRaw('VITE_ADMIN_SUPABASE_ANON_KEY'),
      GOOGLE_MAPS_API_KEY: readRaw('VITE_ADMIN_GOOGLE_MAPS_API_KEY'),
    };
  }
  
  // default: customer
  return {
    SUPABASE_URL: readRaw('VITE_CUSTOMER_SUPABASE_URL'),
    SUPABASE_ANON_KEY: readRaw('VITE_CUSTOMER_SUPABASE_ANON_KEY'),
    GOOGLE_MAPS_API_KEY: readRaw('VITE_CUSTOMER_GOOGLE_MAPS_API_KEY'),
  };
}

/**
 * Legacy environment variable validation schema
 * Kept for backward compatibility with existing code
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL').optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'VITE_SUPABASE_ANON_KEY must be at least 10 characters').optional(),
  VITE_APP_ID: z.string().optional(),
  VITE_API_ENV: z.enum(['development', 'production']).optional().default('development'),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
  // App-specific env vars (optional for backward compatibility)
  VITE_CUSTOMER_SUPABASE_URL: z.string().url().optional(),
  VITE_CUSTOMER_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_CUSTOMER_GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_RUNNER_SUPABASE_URL: z.string().url().optional(),
  VITE_RUNNER_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_RUNNER_GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_ADMIN_SUPABASE_URL: z.string().url().optional(),
  VITE_ADMIN_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_ADMIN_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

/**
 * Validated environment variables (legacy, for backward compatibility)
 */
export const env = envSchema.parse(import.meta.env);

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if running in production
 */
export const isProduction = env.VITE_API_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.VITE_API_ENV === 'development';

/**
 * Get Google Maps API key (uses runtime selector)
 */
export const googleMapsApiKey = getEnv().GOOGLE_MAPS_API_KEY;

/**
 * Get app environment (development, staging, production)
 * Falls back to VITE_API_ENV if VITE_APP_ENV is not set
 */
export const appEnv = (env.VITE_APP_ENV || env.VITE_API_ENV || 'development') as 'development' | 'staging' | 'production';

/**
 * Check if running in production environment
 */
export const isProd = appEnv === 'production';

/**
 * Check if Google Maps is available (has API key)
 */
export const hasGoogleMaps = !!googleMapsApiKey;
