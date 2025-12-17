import React from 'react';

type FindingBenjaminProps = {
  message?: string;
  subtitle?: string;
  isFullscreen?: boolean;
};

export const FindingBenjamin: React.FC<FindingBenjaminProps> = ({ isFullscreen = false }) => {
  // Center of the 100x100 SVG coordinate system
  const center = { x: 50, y: 50 };

  // ROUTES CONFIGURATION
  // 4 lines from 4 different quadrants, all converging to center at the same time
  // To ensure perfect synchronization, all routes are designed to have
  // a total path length of exactly 80 units (Manhattan distance).
  const routes = [
    // 1. TOP-LEFT QUADRANT: Diagonal path (goes right then down)
    { id: 1, start: { x: 10, y: 10 }, path: 'elbow-h' },  // Dist: |40| + |40| = 80
    
    // 2. TOP-RIGHT QUADRANT: Different path (goes down then left)
    { id: 2, start: { x: 90, y: 10 }, path: 'elbow-v' },  // Dist: |40| + |40| = 80
    
    // 3. BOTTOM-LEFT QUADRANT: Straight up from bottom, then to center
    // Start in bottom-left quadrant (x < 50), goes straight up first, then to center
    { id: 3, start: { x: 30, y: 130 }, path: 'elbow-v' },  // Path: up to (30, 50), then to (50, 50)
    
    // 4. BOTTOM-RIGHT QUADRANT: Different path (goes left then up)
    { id: 4, start: { x: 90, y: 90 }, path: 'elbow-h' },  // Dist: |40| + |40| = 80
  ];

  // Helper to generate Path Data (d attribute)
  // All paths are normalized to 80 units total length for perfect synchronization
  const getPathData = (start: { x: number; y: number }, pathType: string) => {
    if (pathType === 'straight-v') {
      // Straight vertical: from start directly to center (vertical line)
      // Used for bottom-left quadrant: goes straight up from bottom
      return `M ${start.x} ${start.y} L ${center.x} ${center.y}`;
    } else if (pathType === 'elbow-h') {
      // Horizontal first: Move X to Center, then Y to Center
      // Used for top-left and bottom-right quadrants
      return `M ${start.x} ${start.y} L ${center.x} ${start.y} L ${center.x} ${center.y}`;
    } else {
      // Vertical first (elbow-v): Move Y to Center, then X to Center
      // Used for top-right quadrant
      return `M ${start.x} ${start.y} L ${start.x} ${center.y} L ${center.x} ${center.y}`;
    }
  };

  // In half-screen mode, constrain to visible 50vh area (top half only)
  // In fullscreen mode, use full height
  const containerClasses = isFullscreen 
    ? "absolute inset-0 w-full h-full bg-[#05060A] overflow-hidden"
    : "absolute top-0 left-0 right-0 w-full h-[50vh] bg-[#05060A] overflow-hidden";
  
  return (
    <div className={containerClasses}>
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
      {/* viewBox includes padding for routes that start outside (e.g., y: -30, y: 130) */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none p-4"
        viewBox="-30 -30 160 160"
        preserveAspectRatio="xMidYMid meet"
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
            d={getPathData(route.start, route.path)}
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
    </div>
  );
};

export default FindingBenjamin;
