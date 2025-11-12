/**
 * Viewport Management Hook
 * 
 * Provides viewport configuration based on app type:
 * - Admin: Responsive (desktop/mobile, web + app)
 * - Runner: Mobile app only (phone viewport)
 * - Customer: Mobile app only (phone viewport)
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';

// Force mobile viewport if env flag is set
const FORCE_MOBILE = import.meta.env.VITE_FORCE_MOBILE === 'true';

export type ViewportMode = 'auto' | 'customer' | 'runner' | 'admin' | 'full';

/**
 * Get viewport mode based on current route (for 'auto' mode)
 */
export function getViewportModeFromRoute(pathname: string): 'mobile-only' | 'responsive' {
  if (pathname.startsWith('/admin')) {
    return 'responsive'; // Admin: desktop/mobile, web + app
  } else if (pathname.startsWith('/runner') || pathname.startsWith('/customer')) {
    return 'mobile-only'; // Runner & Customer: mobile app only
  }
  return 'responsive'; // Default: responsive
}

/**
 * Get the actual viewport mode to apply based on route
 * Always uses route-based detection (explicitMode is always 'auto' now)
 */
function getAppliedMode(explicitMode: ViewportMode, pathname: string): {
  mode: 'mobile-only' | 'responsive';
  appClass: string;
} {
  // Always use route-based detection
  const routeMode = getViewportModeFromRoute(pathname);
  
  if (pathname.startsWith('/customer')) {
    // Customer: Always mobile app viewport
    return { mode: 'mobile-only', appClass: 'customer-app-viewport' };
  } else if (pathname.startsWith('/runner')) {
    // Runner: Always mobile app viewport
    return { mode: 'mobile-only', appClass: 'runner-app-viewport' };
  } else if (pathname.startsWith('/admin')) {
    // Admin: Always responsive viewport
    return { mode: 'responsive', appClass: 'admin-app-viewport' };
  }
  
  // Default: responsive
  return { mode: 'responsive', appClass: '' };
}

/**
 * Hook to manage viewport mode with explicit control
 * Always defaults to 'auto' mode which derives viewport from route
 * (No longer supports manual override - removed toggle UI)
 */
export function useViewportMode() {
  // Always use 'auto' mode - route-based detection only
  // Clear any saved viewport mode from localStorage (from old toggle)
  const [explicitMode] = useState<ViewportMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    // Clear old viewport mode from localStorage if it exists
    const saved = localStorage.getItem('viewport-mode');
    if (saved && saved !== 'auto') {
      localStorage.removeItem('viewport-mode');
    }
    return 'auto';
  });

  // setMode is kept for API compatibility but does nothing
  const setMode = useCallback((mode: ViewportMode) => {
    // No-op: viewport mode is now always 'auto'
  }, []);

  return { mode: explicitMode, setMode };
}

/**
 * Hook to manage viewport constraints based on route
 * Customer and Runner routes ALWAYS use mobile app viewport (phone frame)
 * Admin routes use responsive viewport (full width)
 */
export function useViewport() {
  const location = useLocation();
  const { profile } = useProfile();
  const { mode: explicitMode } = useViewportMode();
  const { mode: appliedMode, appClass } = getAppliedMode(explicitMode, location.pathname);

  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (!viewportMeta) return;

    // Clear any saved viewport mode from localStorage (from old toggle)
    // This ensures route-based detection always works
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('viewport-mode');
      if (saved && saved !== 'auto') {
        localStorage.removeItem('viewport-mode');
      }
    }

    // Remove all viewport-related classes first
    document.body.classList.remove(
      'mobile-app-viewport',
      'responsive-viewport',
      'customer-app-viewport',
      'runner-app-viewport',
      'admin-app-viewport'
    );

    // Force customer and runner routes to mobile app viewport
    // Also treat /account as customer route if user is a customer
    const isAccountRoute = location.pathname === '/account';
    const isCustomerUser = profile?.role.includes('customer') && !profile?.role.includes('admin');
    const isCustomerRoute = location.pathname.startsWith('/customer') || 
                            (isAccountRoute && isCustomerUser);
    const isRunnerRoute = location.pathname.startsWith('/runner');
    const isAdminRoute = location.pathname.startsWith('/admin');

    // Compute the mode based on route
    const computedIsMobile = isCustomerRoute || isRunnerRoute;
    const computedIsAdmin = isAdminRoute;
    
    // Override with mobile if FORCE_MOBILE flag is set, BUT only for customer/runner routes
    // Admin routes should always be responsive, even with FORCE_MOBILE
    const shouldUseMobile = (FORCE_MOBILE || computedIsMobile) && !isAdminRoute;
    
    if (shouldUseMobile) {
      // Customer & Runner: ALWAYS mobile app viewport (phone frame)
      // Also applies if FORCE_MOBILE is true (but not for admin routes)
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
      
      // Add mobile-only class to body for CSS constraints
      document.body.classList.add('mobile-app-viewport');
      if (isCustomerRoute) {
        document.body.classList.add('customer-app-viewport');
      } else if (isRunnerRoute) {
        document.body.classList.add('runner-app-viewport');
      }
    } else if (isAdminRoute) {
      // Admin: ALWAYS responsive viewport (full width) - never forced to mobile
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
      );
      
      // Add responsive class to body
      document.body.classList.add('responsive-viewport');
      document.body.classList.add('admin-app-viewport');
    } else {
      // Default: responsive
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
      );
      
      document.body.classList.add('responsive-viewport');
    }

    // Detect if we're in device emulation mode (for CSS to remove phone frame)
    // Only check for customer/runner routes (mobile app viewport)
    // Only remove phone frame when actually using browser DevTools device emulation
    // (not just when window is small or mobile-like)
    if (isCustomerRoute || isRunnerRoute) {
      // Only set device-emulation if we're actually in browser DevTools device emulation
      // This is detected by checking if the viewport width matches common device widths
      // AND the window is in portrait mode AND we're on desktop (not a real mobile device)
      const isDesktopBrowser = window.innerWidth > 768 || window.screen.width > 768;
      const commonDeviceWidths = [375, 390, 393, 428, 430, 360, 414];
      const isCommonDeviceWidth = commonDeviceWidths.includes(window.innerWidth);
      
      // Only consider it device emulation if:
      // 1. We're on a desktop browser (not a real mobile device)
      // 2. Window width matches a common device width
      // 3. Window is in portrait mode (height > width)
      // This ensures the phone frame shows on desktop, but disappears in DevTools device emulation
      const isDeviceEmulation = isDesktopBrowser && 
                                isCommonDeviceWidth && 
                                window.innerHeight > window.innerWidth &&
                                window.innerWidth <= 500;
      
      // NEVER set device-emulation for customer/runner routes on desktop
      // Always show phone frame on desktop browsers for consistent UX
      // Only remove phone frame in actual browser DevTools device emulation (which we can't reliably detect)
      // For now, always show phone frame on desktop for customer and runner apps
      document.body.removeAttribute('data-device-emulation');

      // Log viewport mode in development
      if (import.meta.env.DEV) {
        const mode = FORCE_MOBILE ? 'mobile-app-viewport (forced)' : 'mobile-app-viewport';
        const deviceEmulation = FORCE_MOBILE ? 'forced mobile' : 'false (always show phone frame on desktop)';
        console.log(`[Viewport] Route: ${location.pathname} | Mode: ${mode} | Device Emulation: ${deviceEmulation}`);
      }
    } else {
      document.body.removeAttribute('data-device-emulation');
      
      // Log viewport mode in development
      if (import.meta.env.DEV) {
        // Admin routes are always responsive, never forced to mobile
        const mode = isAdminRoute ? 'responsive-viewport' : (FORCE_MOBILE ? 'mobile-app-viewport (forced)' : 'responsive-viewport');
        const deviceEmulation = isAdminRoute ? 'normal' : (FORCE_MOBILE ? 'forced mobile' : 'normal');
        console.log(`[Viewport] Route: ${location.pathname} | Mode: ${mode} | Device Emulation: ${deviceEmulation}`);
      }
    }

    // Cleanup on unmount
    return () => {
      // Reset to default on unmount
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
      document.body.removeAttribute('data-device-emulation');
    };
  }, [appliedMode, appClass, explicitMode, location.pathname, profile]);

  return { mode: appliedMode, isMobileOnly: appliedMode === 'mobile-only', explicitMode };
}

