import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";

/**
 * Full-width morphing Top Shelf wrapper.
 * - Sits directly under the persistent header bar
 * - Full width, rounded only at bottom
 * - Bottom-only shadow (no top shadow)
 * - Uses phase-based transitions for zero jitter
 */
type Props = {
  children?: React.ReactNode;
};

export default function CustomerTopShelf({ 
  children 
}: Props) {
  const prefersReduced = useReducedMotion();
  const shelf = useTopShelfTransition({ minBase: 168, settleDelayMs: 240 });
  
  const transition = prefersReduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.6 };

  return (
    <div className="sticky top-[68px] z-30 bg-white w-full left-0 right-0">
      {/* top offset ~= header height; keep same bg as header */}
      <motion.section
        layout
        layoutId="customer-top-shelf"
        transition={transition}
        // Full width edge-to-edge, rounded only on bottom, bottom-only shadow:
        className="w-full rounded-t-none rounded-b-3xl bg-white shadow-[0_14px_32px_rgba(0,0,0,0.08)]"
        style={{ 
          willChange: 'height',
          minHeight: shelf.reservedMinH 
        }}
        role="region"
        aria-label="Top content"
      >
        {/* Inner content wrapper - full width, container sets padding */}
        {/* Container sets padding: horizontal AND vertical (equal) */}
        <div className="w-full px-5 pt-5 pb-5">
          {children}
        </div>
      </motion.section>
    </div>
  );
}
