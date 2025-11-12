import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 * Fails loudly if any required variable is missing or invalid
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(10, 'VITE_SUPABASE_ANON_KEY must be at least 10 characters'),
  VITE_APP_ID: z.string().optional(),
  VITE_API_ENV: z.enum(['development', 'production']).optional().default('development'),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
});

/**
 * Validated environment variables
 * Use this instead of import.meta.env for type safety
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
 * Get Google Maps API key (optional, never throws)
 */
export const googleMapsApiKey = env.VITE_GOOGLE_MAPS_API_KEY;

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
