/**
 * Viewport Indicator (Dev Only)
 * 
 * Shows current viewport mode in development
 * Helps ensure you're testing in the correct viewport
 */

import { useState, useEffect } from "react";
import { useViewport } from "@/hooks/useViewport";
import { useLocation } from "react-router-dom";

export function ViewportIndicator() {
  const { mode, isMobileOnly, explicitMode } = useViewport();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Check localStorage for visibility preference
  useEffect(() => {
    const stored = localStorage.getItem('viewport-indicator-visible');
    setIsVisible(stored === null ? false : stored === 'true'); // Default to hidden
  }, []);

  const appType = location.pathname.startsWith('/admin')
    ? 'Admin (Responsive)'
    : location.pathname.startsWith('/runner')
    ? 'Runner (Mobile-only)'
    : location.pathname.startsWith('/customer')
    ? 'Customer (Mobile-only)'
    : 'Default (Responsive)';

  const isDesktop = window.innerWidth >= 768;
  const isMobileOnlyOnDesktop = isMobileOnly && isDesktop;

  // Toggle visibility with keyboard shortcut (Ctrl/Cmd + Shift + V)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        localStorage.setItem('viewport-indicator-visible', String(newVisibility));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg font-mono border border-white/20"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="font-semibold text-yellow-400">📱 Viewport Mode</div>
          <button
            onClick={() => {
              setIsVisible(false);
              localStorage.setItem('viewport-indicator-visible', 'false');
            }}
            className="text-gray-400 hover:text-white text-xs"
            title="Hide (Ctrl/Cmd + Shift + V to toggle)"
          >
            ✕
          </button>
        </div>
        <div className="text-white font-medium">{appType}</div>
        <div className="text-gray-400">
          Explicit Mode: <span className="text-white">{explicitMode}</span>
        </div>
        <div className="text-gray-400">
          Applied Mode: <span className="text-white">{mode}</span>
        </div>
        <div className="text-gray-400">
          Size: <span className="text-white">{window.innerWidth}x{window.innerHeight}</span>
        </div>
        {isMobileOnlyOnDesktop && (
          <div className="text-xs text-green-300 mt-1 border-t border-white/10 pt-1">
            ✅ Mobile app shown in phone frame (desktop testing)
          </div>
        )}
        {isMobileOnly && !isDesktop && (
          <div className="text-xs text-yellow-300 mt-1 border-t border-white/10 pt-1">
            ⚠️ Mobile-only: Use device emulation for accurate testing
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1 border-t border-white/10 pt-1">
          Press Ctrl/Cmd + Shift + V to toggle
        </div>
      </div>
    </div>
  );
}

