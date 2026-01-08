import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';

/**
 * Initialize Sentry for error tracking
 * 
 * Set VITE_SENTRY_DSN in your .env.local file:
 * VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  const isNative = Capacitor.isNativePlatform();
  const environment = import.meta.env.MODE || 'development';

  Sentry.init({
    dsn,
    environment,
    integrations: [
      // Capture unhandled promise rejections
      Sentry.captureConsoleIntegration({
        levels: ['error'],
      }),
    ],
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Session replay (optional, can be expensive)
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Native app specific settings
    ...(isNative && {
      // Enable native crash reporting
      enableNative: true,
      // Native frames for stack traces
      enableNativeCrashHandling: true,
    }),

    beforeSend(event, hint) {
      // Add custom context
      if (event.contexts) {
        event.contexts.runtime = {
          name: isNative ? 'capacitor' : 'web',
          version: Capacitor.getVersion(),
        };
      }

      // Filter out sensitive data
      if (event.request?.headers) {
        // Remove auth headers
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
      }

      return event;
    },
  });

  console.log('[Sentry] Initialized for', isNative ? 'native' : 'web', 'environment:', environment);
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email?: string; role?: string[] }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    // Store role as a tag for filtering
    role: user.role?.join(',') || 'customer',
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: context,
    extra: context,
  });
}

