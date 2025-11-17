import React, { useRef, useEffect } from "react";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";
import { cn } from "@/lib/utils";

/**
 * Full-width morphing Top Shelf wrapper.
 * - Fixed to top of screen (below header)
 * - Full width, rounded only at bottom
 * - Height hugs content (no fixed min-height)
 */
type Props = {
  children?: React.ReactNode;
  extendToBottom?: boolean; // If true, extends all the way down and tucks under bottom nav (for cash amount page)
};

export default function CustomerTopShelf({ 
  children,
  extendToBottom = false,
}: Props) {
  const shelf = useTopShelfTransition({ minBase: 168, settleDelayMs: 240 });
  const shelfRef = useRef<HTMLDivElement>(null);

  // Calculate top position: safe area + header content height
  // Header has: safe area padding + logo (28px) + bottom padding (12px from pb-3) = safe area + 40px
  // Top shelf should start exactly where header ends
  const headerContentHeight = 40; // Logo (28px) + bottom padding (12px)

  // Update CSS variable for top shelf height so content can account for it
  useEffect(() => {
    if (!shelfRef.current) return;

    const updateHeight = () => {
      if (shelfRef.current) {
        const height = shelfRef.current.offsetHeight;
        document.documentElement.style.setProperty('--top-shelf-height', `${height}px`);
      }
    };

    // Initial update
    updateHeight();

    // Observe resize changes
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(shelfRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  // Tuck amount to pin under bottom nav (same as map viewport: 26px)
  const TUCK_AMOUNT = 26;
  
  // Calculate height based on extendToBottom prop
  // If extendToBottom: extend all the way down and tuck under bottom nav
  // Otherwise: just hug content (auto height)
  const height = extendToBottom 
    ? `calc(100vh - max(44px, env(safe-area-inset-top)) - ${headerContentHeight}px + ${TUCK_AMOUNT}px)`
    : 'auto';

  return (
    <div 
      ref={shelfRef}
      className={cn(
        "fixed z-[65] bg-white w-full left-0 right-0 rounded-bl-3xl rounded-br-3xl"
      )}
      style={{ 
        // Start with slight overlap to ensure seamless connection (no visible line)
        // Overlap hides any potential shadow artifacts or rendering gaps
        top: `calc(max(44px, env(safe-area-inset-top)) + ${headerContentHeight}px - 1px)`,
        height: height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Bottom-only shadow: only appears below the component (positive Y offset, no upward spread)
        // Matches bottom nav shadow style: lighter grey with higher blur
        ...(!extendToBottom && {
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        }),
      }}
    >
      {/* Fixed below header; keep same bg as header */}
      <section
        // Full width edge-to-edge, rounded only on bottom, no shadow:
        // Height hugs content up to maxHeight, then scrolls
        className={cn(
          "w-full bg-white flex flex-col",
          extendToBottom ? "flex-1 min-h-0 overflow-hidden" : ""
        )}
        role="region"
        aria-label="Top content"
      >
        {/* Scrollable content wrapper - full width, container sets padding */}
        {/* Standardized spacing: px-6 (24px) horizontal, pt-6 pb-6 (24px) vertical */}
        {/* space-y-6 (24px) between direct children (logo row, greeting block, first card) */}
        {/* Only make scrollable if extendToBottom is true, otherwise just normal flow */}
        <div 
          className={cn(
            "w-full px-6 pt-6 space-y-6",
            extendToBottom && "overflow-y-auto flex-1 min-h-0"
          )}
          style={extendToBottom ? { 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(150px + max(24px, env(safe-area-inset-bottom)))', // Space for bottom nav + safe area
            touchAction: 'pan-y', // Allow vertical scrolling
          } : {
            paddingBottom: '24px' // pb-6 when not extended
          }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
