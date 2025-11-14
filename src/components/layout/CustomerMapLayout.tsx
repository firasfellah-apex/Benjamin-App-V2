/**
 * CustomerMapLayout Component
 *
 * 3-band layout for customer screens:
 * - Top panel: auto-height, hugs its content
 * - Map band: flex-1, fills remaining viewport height
 * - Bottom panel: auto-height, hugs its content
 *
 * Used for:
 * - Home (pre-order, top heavy)
 * - Address selection
 * - Cash amount
 * - Post-order tracking (bottom heavy)
 */

import React from "react";
import { cn } from "@/lib/utils";

interface CustomerMapLayoutProps {
  /** Stuff that lives in the top white card: titles, subtitles, cards, actions */
  top: React.ReactNode;
  /** The actual map element (Google Map or wrapper) */
  map: React.ReactNode;
  /** Stuff that lives in the bottom white card: CTAs, status, summary, etc */
  bottom: React.ReactNode;
  /** Optional className overrides */
  className?: string;
}

export const CustomerMapLayout: React.FC<CustomerMapLayoutProps> = ({
  top,
  map,
  bottom,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[#f5f6f8]",
        "text-[#0f172a]",
        className
      )}
    >
      {/* TOP PANEL (auto height) */}
      <div className="relative z-20 flex-shrink-0 flex justify-center w-full">
        {top}
      </div>

      {/* MAP BAND (flex-grow area between top & bottom) */}
      <div className="relative flex-1 min-h-[200px] z-0 flex justify-center w-full">
        {/* Whatever is passed as `map` MUST be full-height (h-full) */}
        {map}
      </div>

      {/* BOTTOM PANEL (auto height) */}
      <div className="relative z-20 flex-shrink-0 flex justify-center w-full">
        {bottom}
      </div>
    </div>
  );
};

export default CustomerMapLayout;
