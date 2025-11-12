/**
 * CustomerMapLayoutBase Component
 * 
 * Base layout that organizes 3 main zones:
 * - Top shell (auto height, hugs content)
 * - Map viewport (flex-grow, fills remaining space)
 * - Bottom shell (auto height, hugs content)
 * 
 * Uses flexbox to naturally handle height distribution without JS measurement.
 */

import React from "react";

interface CustomerMapLayoutBaseProps {
  top: React.ReactNode;      // dynamic hugging top panel
  map: React.ReactNode;      // Google Map or placeholder
  bottom: React.ReactNode;   // dynamic hugging bottom panel
}

export const CustomerMapLayoutBase: React.FC<CustomerMapLayoutBaseProps> = ({
  top,
  map,
  bottom,
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f6f8]">
      {/* Top shell (auto height) */}
      <div className="relative z-20 flex-shrink-0 flex justify-center">
        {top}
      </div>

      {/* Map viewport (flex-grow area between top & bottom) */}
      <div className="relative flex-1 overflow-hidden z-0 min-h-0 flex justify-center">
        {map}
      </div>

      {/* Bottom shell (auto height) */}
      <div className="relative z-20 flex-shrink-0 flex justify-center">
        {bottom}
      </div>
    </div>
  );
};

