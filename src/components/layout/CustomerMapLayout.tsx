/**
 * CustomerMapLayout Component
 * 
 * 3-band layout for customer screens:
 * - Top panel: auto-height, hugs its content, rounded bottom
 * - Map band: dynamic height = viewport - (top + bottom)
 * - Bottom panel: auto-height, hugs its content, rounded top
 * 
 * Used for:
 * - Home (pre-order, top heavy)
 * - Address selection
 * - Cash amount
 * - Post-order tracking (bottom heavy)
 */

import React, { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CustomerMapLayoutProps {
  /** Stuff that lives in the top white card: titles, subtitles, cards, actions */
  topContent: React.ReactNode;
  /** Stuff that lives in the bottom white card: CTAs, status, summary, etc */
  bottomContent: React.ReactNode;
  /** The actual map element (Google Map or wrapper) */
  map: React.ReactNode;
  /** Optional className overrides */
  className?: string;
}

export const CustomerMapLayout: React.FC<CustomerMapLayoutProps> = ({
  topContent,
  bottomContent,
  map,
  className,
}) => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [mapHeight, setMapHeight] = useState<number>(240);

  useLayoutEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      const topH = topRef.current?.offsetHeight ?? 0;
      const bottomH = bottomRef.current?.offsetHeight ?? 0;

      // Map fills everything in between; keep reasonable min + max
      let h = vh - topH - bottomH;
      if (h < 120) h = 120;
      setMapHeight(h);
    };

    update();
    window.addEventListener("resize", update);
    
    // Use ResizeObserver to watch for content changes
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(update);
      if (topRef.current) resizeObserver.observe(topRef.current);
      if (bottomRef.current) resizeObserver.observe(bottomRef.current);
    }

    return () => {
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, [topContent, bottomContent]);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[#f5f6f8]",
        "text-[#0f172a]",
        className
      )}
    >
      {/* TOP PANEL (dynamic height) */}
      <div
        ref={topRef}
        className={cn(
          "px-6 pt-6 pb-6 bg-white",
          "rounded-b-[32px]",
          "shadow-[0_10px_30px_rgba(15,23,42,0.05)]",
          "flex flex-col gap-4",
          "max-w-md mx-auto w-full"
        )}
      >
        {topContent}
      </div>

      {/* MAP BAND (always between top & bottom) */}
      <div className="relative w-full overflow-hidden">
        <div
          className="w-full max-w-md mx-auto"
          style={{
            height: mapHeight,
            transition: "height 0.25s ease",
          }}
        >
          {map}
        </div>
      </div>

      {/* BOTTOM PANEL (dynamic height) */}
      <div
        ref={bottomRef}
        className={cn(
          "px-6 pt-4 pb-6 bg-white",
          "rounded-t-[32px]",
          "shadow-[0_-10px_30px_rgba(15,23,42,0.06)]",
          "flex flex-col gap-3",
          "max-w-md mx-auto w-full"
        )}
      >
        {bottomContent}
      </div>
    </div>
  );
};

