import React from 'react';

type FindingBenjaminProps = {
  message?: string;
  subtitle?: string;
};

export const FindingBenjamin: React.FC<FindingBenjaminProps> = ({}) => {
  // Center of the 100x100 SVG coordinate system
  const center = { x: 50, y: 50 };

  // ROUTES CONFIGURATION
  // To ensure perfect synchronization, all routes are designed to have
  // a "Manhattan Distance" (abs(x-50) + abs(y-50)) of exactly 80.
  // This means they will all traverse the grid and hit the center simultaneously.
  const routes = [
    // 1. TOP EDGE (Coming down)
    { id: 1, start: { x: 50, y: -30 }, elbow: 'v' }, // Dist: |0| + |-80| = 80

    // 2. BOTTOM EDGE (Coming up)
    { id: 2, start: { x: 50, y: 130 }, elbow: 'v' }, // Dist: |0| + |80| = 80

    // 3. LEFT EDGE (Coming right)
    { id: 3, start: { x: -30, y: 50 }, elbow: 'h' }, // Dist: |-80| + |0| = 80

    // 4. RIGHT EDGE (Coming left)
    { id: 4, start: { x: 130, y: 50 }, elbow: 'h' }, // Dist: |80| + |0| = 80
    // 5. TOP-LEFT DIAGONALISH
    { id: 5, start: { x: 10, y: -10 }, elbow: 'v' }, // Dist: |40| + |60| = 100 (Adjusted slightly visually, but normalized via dash)
    // Let's stick to strict 80 dist for perfect sync:
    { id: 6, start: { x: 10, y: 10 }, elbow: 'h' },  // Dist: |40| + |40| = 80
    // 6. TOP-RIGHT DIAGONALISH
    { id: 7, start: { x: 90, y: 10 }, elbow: 'h' },  // Dist: |40| + |40| = 80
    // 7. BOTTOM-LEFT DIAGONALISH
    { id: 8, start: { x: 10, y: 90 }, elbow: 'v' },  // Dist: |40| + |40| = 80
    // 8. BOTTOM-RIGHT DIAGONALISH
    { id: 9, start: { x: 90, y: 90 }, elbow: 'v' },  // Dist: |40| + |40| = 80
  ];

  // Helper to generate Path Data (d attribute)
  const getPathData = (start: { x: number; y: number }, elbow: string) => {
    if (elbow === 'h') {
      // Horizontal first: Move X to Center, then Y to Center
      return `M ${start.x} ${start.y} L ${center.x} ${start.y} L ${center.x} ${center.y}`;
    } else {
      // Vertical first: Move Y to Center, then X to Center
      return `M ${start.x} ${start.y} L ${start.x} ${center.y} L ${center.x} ${center.y}`;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#05060A] overflow-hidden">
      {/* 1. BACKGROUND GRID (Visuals Only) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="grid grid-cols-8 grid-rows-8 gap-[4px] h-full w-full p-4">
          {[...Array(64)].map((_, i) => (
            <div
              key={i}
              className="rounded-[4px]"
              style={{
                backgroundColor: i % 3 === 0 ? '#1A1F2E' : i % 7 === 0 ? '#202636' : '#151923',
              }}
            />
          ))}
        </div>
      </div>
      {/* 2. SVG ANIMATION LAYER (The Routes) */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none p-4"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {routes.map((route) => (
          <path
            key={route.id}
            d={getPathData(route.start, route.elbow)}
            fill="none"
            stroke="#02C97A"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            // The dash array: 25 unit "comet", 1000 unit gap
            strokeDasharray="25 1000"
            className="animate-dash-travel"
            style={{
              // No delay here! All move in unison.
              // Opacity prevents them from being seen before animation starts
            }}
          />
        ))}
      </svg>
      {/* 3. CENTER TARGET / PULSE */}
      {/* These pulse animations are perfectly timed in tailwind.config.js to start exactly when the lines hit (50% mark) */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        {/* The Dot itself */}
        <div className="w-3 h-3 bg-[#02C97A] rounded-full shadow-[0_0_15px_#02C97A] animate-dot-impact" />
        {/* The Shockwaves */}
        <div className="absolute w-full h-full max-w-[300px] max-h-[300px] flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-[#02C97A]/30 animate-radar-shockwave" />
          <div className="absolute w-20 h-20 rounded-full bg-[#02C97A]/20 animate-radar-shockwave" style={{ animationDelay: '0.1s' }} />
        </div>
      </div>
      {/* Optional: Static Crosshairs UI */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#02C97A]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#02C97A]" />
      </div>
    </div>
  );
};

export default FindingBenjamin;
