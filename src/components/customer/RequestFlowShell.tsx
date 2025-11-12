/**
 * RequestFlowShell Component
 * 
 * Shared layout component for all request flow steps.
 * Provides:
 * - Fixed top panel (title, subtitle, content)
 * - Map band between top and bottom (auto-resizes based on panel heights)
 * - Fixed bottom bar (wired to RequestFlowBottomBar)
 * 
 * The map automatically adjusts its height as the top/bottom panels resize.
 */

import React, { useEffect, useRef, useState } from "react";
import { CustomerMap } from "./CustomerMap";

export interface RequestFlowShellProps {
  /** Main title, e.g. "Where should we deliver?" */
  title: string;
  /** Subtitle under title */
  subtitle?: string;
  /** Content under subtitle inside top panel (address cards, cash slider, etc.) */
  children: React.ReactNode;
  /** Map props */
  selectedAddress?: {
    label?: string;
    lat?: number;
    lng?: number;
  } | null;
  /** Bottom bar content (typically RequestFlowBottomBar) */
  bottomBar?: React.ReactNode;
}

export function RequestFlowShell({
  title,
  subtitle,
  children,
  selectedAddress,
  bottomBar,
}: RequestFlowShellProps) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [topH, setTopH] = useState(0);
  const [bottomH, setBottomH] = useState(0);

  useEffect(() => {
    if (!topRef.current) return;

    const update = () => {
      setTopH(topRef.current?.offsetHeight ?? 0);
      // Only measure bottom if it exists
      if (bottomRef.current) {
        setBottomH(bottomRef.current.offsetHeight);
      } else {
        setBottomH(0);
      }
    };

    // Initial measurement
    update();

    // Watch for size changes on top panel
    const topObserver = new ResizeObserver(update);
    topObserver.observe(topRef.current);

    // Watch for size changes on bottom bar (if it exists)
    let bottomObserver: ResizeObserver | null = null;
    if (bottomRef.current) {
      bottomObserver = new ResizeObserver(update);
      bottomObserver.observe(bottomRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', update);

    return () => {
      topObserver.disconnect();
      bottomObserver?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [bottomBar]); // Re-run when bottomBar changes

  return (
    <div className="relative min-h-screen bg-[#F4F6F9]">
      {/* Top nav / content panel */}
      <div
        ref={topRef}
        className="
          fixed top-0 left-0 right-0 z-30
          bg-white/96 backdrop-blur-sm
          shadow-[0_10px_30px_rgba(15,23,42,0.10)]
          rounded-b-3xl
          px-6 pt-6 pb-4
          max-w-md mx-auto
          max-h-[70vh] overflow-y-auto
        "
      >
        <h1 className="text-[24px] font-semibold leading-snug text-[#0F172A]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[14px] text-[#6B7280]">
            {subtitle}
          </p>
        )}
        <div className="mt-4">
          {children}
        </div>
      </div>

      {/* Map band between top + bottom */}
      <div
        className="fixed inset-x-0 z-10 max-w-md mx-auto"
        style={{
          top: `${topH}px`,
          bottom: `${bottomH}px`,
        }}
      >
        <CustomerMap selectedAddress={selectedAddress} />
      </div>

      {/* Bottom nav */}
      {bottomBar && (
        <div
          ref={bottomRef}
          className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto"
        >
          {bottomBar}
        </div>
      )}
    </div>
  );
}

