/**
 * CustomerScreenLayout Component
 * 
 * Standardized layout for customer screens (Home, Select Address, Cash Amount).
 * Provides:
 * - Fixed top shell (dynamic height, hugs content)
 * - Map canvas (fills space between top and bottom)
 * - Fixed bottom bar (shared across flow)
 * 
 * Behavior:
 * - Top shell auto-grows based on content
 * - Map height is calculated dynamically based on viewport and top/bottom heights
 * - Bottom bar is always fixed at the bottom
 * - All business logic remains unchanged; this is layout only
 */

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";
import { CustomerMap } from "@/components/maps/CustomerMap";
import { cn } from "@/lib/utils";
import type { CustomerAddress } from "@/types/types";

type CustomerScreenLayoutProps = {
  topContent: ReactNode; // title, subtitle, chips, etc.
  children?: ReactNode; // optional scrollable content BELOW topContent but ABOVE map
  selectedAddress?: CustomerAddress | null; // address to center map on
  showBottomBar?: boolean;
  bottomBarMode?: "home" | "address" | "amount";
  onPrimary?: () => void;
  onSecondary?: () => void;
  isLoading?: boolean;
  primaryDisabled?: boolean;
};

export function CustomerScreenLayout({
  topContent,
  children,
  selectedAddress,
  showBottomBar = true,
  bottomBarMode = "address",
  onPrimary,
  onSecondary,
  isLoading = false,
  primaryDisabled = false,
}: CustomerScreenLayoutProps) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const [mapDimensions, setMapDimensions] = useState({
    top: 200,
    height: 400,
  });

  useEffect(() => {
    const updateDimensions = () => {
      requestAnimationFrame(() => {
        const topSheet = topRef.current;
        const bottomBar = document.querySelector('[data-request-flow-bottom-bar]') as HTMLElement;
        const viewportHeight = window.innerHeight;
        const headerHeight = 64; // CustomerHeader height
        const minHeight = 160;

        let top = headerHeight + 100; // Default fallback
        let height = 400; // Default fallback

        // Get top sheet bottom position
        if (topSheet) {
          const rect = topSheet.getBoundingClientRect();
          if (rect.height > 0 && rect.bottom > 0) {
            top = rect.bottom;
          }
        }

        // Get bottom bar top position and calculate height
        if (bottomBar) {
          const rect = bottomBar.getBoundingClientRect();
          if (rect.height > 0 && rect.top > 0) {
            const availableHeight = rect.top - top;
            if (availableHeight > minHeight) {
              height = availableHeight;
            } else {
              // Not enough space - use minimum and adjust
              height = minHeight;
              if (rect.top - minHeight > headerHeight) {
                top = rect.top - minHeight - 10;
              }
            }
          }
        } else {
          // No bottom bar - fill to viewport bottom
          height = Math.max(viewportHeight - top - 20, minHeight);
        }

        // Validate dimensions
        top = Math.max(headerHeight, Math.min(top, viewportHeight - minHeight - 20));
        height = Math.max(minHeight, Math.min(height, viewportHeight - top - 20));

        setMapDimensions({ top, height });
      });
    };

    // Initial update with multiple attempts to catch DOM changes
    updateDimensions();
    const t1 = setTimeout(updateDimensions, 50);
    const t2 = setTimeout(updateDimensions, 200);
    const t3 = setTimeout(updateDimensions, 500);

    // Event listeners
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);

    // ResizeObserver for top sheet and bottom bar
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateDimensions);
      if (topRef.current) {
        resizeObserver.observe(topRef.current);
      }
      // Try to observe bottom bar (may not be rendered yet)
      const tryObserveBottomBar = () => {
        if (showBottomBar && onPrimary) {
          const bottomBar = document.querySelector('[data-request-flow-bottom-bar]');
          if (bottomBar && resizeObserver) {
            resizeObserver.observe(bottomBar);
          }
        }
      };
      // Try multiple times to catch when bottom bar is rendered
      tryObserveBottomBar();
      const bottomBarTimeout1 = setTimeout(tryObserveBottomBar, 50);
      const bottomBarTimeout2 = setTimeout(tryObserveBottomBar, 200);
      const bottomBarTimeout3 = setTimeout(tryObserveBottomBar, 500);
      
      // Store timeouts for cleanup
      (resizeObserver as any).__timeouts = [bottomBarTimeout1, bottomBarTimeout2, bottomBarTimeout3];
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
      if (resizeObserver) {
        // Clear any timeouts stored on the observer
        const timeouts = (resizeObserver as any).__timeouts;
        if (timeouts) {
          timeouts.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout));
        }
        resizeObserver.disconnect();
      }
    };
  }, [topContent, children, showBottomBar, onPrimary]);

  // Ensure valid dimensions
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const safeTop = Math.max(64, Math.min(mapDimensions.top || 200, viewportHeight - 200));
  const safeHeight = Math.max(160, Math.min(mapDimensions.height || 400, viewportHeight - safeTop - 100));

  return (
    <>
      {/* TOP NAV / CONTENT */}
      <div
        ref={topRef}
        data-customer-screen-top
        className="fixed top-16 inset-x-0 z-30 flex justify-center pointer-events-none"
      >
        <div
          className={cn(
            "pointer-events-auto w-full max-w-md",
            "bg-white rounded-b-[32px]",
            "shadow-[0_8px_24px_rgba(15,23,42,0.06)]",
            "px-6 pt-4 pb-6",
            "shrink-0"
          )}
        >
          {topContent}

          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* MAP REGION */}
      <div
        className="fixed inset-x-0 z-10 flex justify-center overflow-hidden bg-[#E5E7EB]"
        style={{
          top: `${safeTop}px`,
          height: `${safeHeight}px`,
          minHeight: '160px',
        }}
      >
        <div className="w-full max-w-md h-full">
          <CustomerMap selectedAddress={selectedAddress} />
        </div>
      </div>

      {/* BOTTOM NAV */}
      {showBottomBar && onPrimary && (
        <RequestFlowBottomBar
          mode={bottomBarMode}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          isLoading={isLoading}
          primaryDisabled={primaryDisabled}
        />
      )}
    </>
  );
}

