/**
 * CustomerScreen Component
 * 
 * Shared 3-zone layout for customer pages:
 * - Header: hugs content (logo/menu + page content)
 * - Map: flex-1 fills remaining space (with padding-bottom for fixed footer)
 * - Footer: fixed to bottom, hugs content (bottom nav/CTAs)
 * 
 * No nested cards or frames - full viewport layout.
 * Includes smooth morphing transitions between states.
 */

import React from "react";
import { motion } from "framer-motion";

interface CustomerScreenProps {
  header: React.ReactNode;       // top nav / content
  map?: React.ReactNode;         // middle map area
  footer?: React.ReactNode;      // bottom nav / CTAs (will be fixed to bottom)
}

const transitionConfig = {
  duration: 0.3,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  layout: {
    duration: 0.3,
    ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  },
};

export function CustomerScreen({ header, map, footer }: CustomerScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7]">
      {/* TOP: hugs content with rounded bottom corners and shadow */}
      <motion.header
        layoutId="customer-screen-header"
        layout="position"
        transition={transitionConfig}
        style={{ willChange: 'height' }}
        className="relative z-20 bg-white rounded-b-[32px] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        {header}
      </motion.header>

      {/* MIDDLE: flex map / content - tucks under top nav with negative margin */}
      <motion.main
        layout
        transition={transitionConfig}
        style={{ willChange: 'transform' }}
        className="relative z-10 flex-1 min-h-0 -mt-8"
      >
        {map}
      </motion.main>

      {/* BOTTOM: fixed to bottom, hugging content */}
      {/* Footer components handle their own fixed positioning */}
      {footer}
    </div>
  );
}

