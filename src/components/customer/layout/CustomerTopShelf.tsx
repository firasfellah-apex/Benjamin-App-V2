import React from "react";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";

/**
 * Full-width morphing Top Shelf wrapper.
 * - Sits directly under the persistent header bar
 * - Full width, rounded only at bottom
 * - Bottom-only shadow (no top shadow)
 * - Height hugs content (no fixed min-height)
 */
type Props = {
  children?: React.ReactNode;
};

export default function CustomerTopShelf({ 
  children 
}: Props) {
  const shelf = useTopShelfTransition({ minBase: 168, settleDelayMs: 240 });

  return (
    <div className="sticky top-[68px] z-[65] bg-white w-full left-0 right-0 rounded-bl-3xl rounded-br-3xl overflow-hidden">
      {/* top offset ~= header height; keep same bg as header */}
      <section
        // Full width edge-to-edge, rounded only on bottom, no shadow:
        // Height hugs content - no minHeight constraint
        className="w-full bg-white"
        role="region"
        aria-label="Top content"
      >
        {/* Inner content wrapper - full width, container sets padding */}
        {/* Standardized spacing: px-6 (24px) horizontal, pt-6 pb-6 (24px) vertical */}
        {/* space-y-6 (24px) between direct children (logo row, greeting block, first card) */}
        <div className="w-full px-6 pt-6 pb-6 space-y-6">
          {children}
        </div>
      </section>
    </div>
  );
}
