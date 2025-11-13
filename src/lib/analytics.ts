/**
 * Analytics Utility
 * 
 * Simple, tree-shakeable analytics tracking that can be easily replaced
 * with Segment, PostHog, or other analytics providers.
 * 
 * In development, logs events to console.
 * In production, can be swapped out for real analytics provider.
 */

type AnalyticsEvent = string;
type AnalyticsProps = Record<string, unknown>;

/**
 * Track an analytics event
 * 
 * @param event - Event name (e.g., 'profile_completed', 'address_selected')
 * @param props - Event properties (avoid PII - no emails, phone numbers, addresses, etc.)
 * 
 * @example
 * track('profile_completed', { has_avatar: true, field_count: 3 })
 * track('address_selected', { address_count: 2, is_default: true })
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, props || {});
  }
  
  // In production, replace this with your analytics provider:
  // if (window.analytics) {
  //   window.analytics.track(event, props);
  // }
  // or
  // posthog.capture(event, props);
}

/**
 * Identify a user (call once on login)
 * 
 * @param userId - User ID (not email or PII)
 * @param traits - User traits (avoid PII)
 */
export function identify(userId: string, traits?: AnalyticsProps): void {
  if (import.meta.env.DEV) {
    console.log('[Analytics] identify', userId, traits || {});
  }
  
  // In production:
  // if (window.analytics) {
  //   window.analytics.identify(userId, traits);
  // }
}

/**
 * Reset analytics (call on logout)
 */
export function reset(): void {
  if (import.meta.env.DEV) {
    console.log('[Analytics] reset');
  }
  
  // In production:
  // if (window.analytics) {
  //   window.analytics.reset();
  // }
}








