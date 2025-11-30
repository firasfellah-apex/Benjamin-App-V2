/**
 * BACKUP - Original div-based implementation
 * 
 * To revert: Rename this file to FindingBenjamin.tsx
 * and remove the new keyframes from tailwind.config.js
 */

/**
 * FindingBenjamin
 *
 * Full-screen pre-map state with animated routes converging toward center.
 * All routes move at the same pace and reach the center simultaneously.
 */

import React from 'react';

type FindingBenjaminProps = {
  message?: string;
  subtitle?: string;
};

export const FindingBenjamin: React.FC<FindingBenjaminProps> = ({}) => {
  // Road positions in the 8x8 grid (roads are between blocks)
  // Roads are at: 12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5%
  const roadPositions = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
  const centerX = 50;
  const centerY = 50;
  
  // Routes starting from edges, aligned to road grid
  // Each route: start position (x, y), direction (h-first or v-first)
  // All routes will take 2s to reach center, then dot pulsates
  const routes = [
    // Top edge - horizontal first
    { id: '1', startX: 0, startY: 12.5, hFirst: true },
    { id: '2', startX: 100, startY: 25, hFirst: true },
    { id: '3', startX: 0, startY: 37.5, hFirst: true },
    // Bottom edge - horizontal first
    { id: '4', startX: 100, startY: 62.5, hFirst: true },
    { id: '5', startX: 0, startY: 75, hFirst: true },
    { id: '6', startX: 100, startY: 87.5, hFirst: true },
    // Left edge - vertical first
    { id: '7', startX: 12.5, startY: 0, hFirst: false },
    { id: '8', startX: 25, startY: 0, hFirst: false },
    // Right edge - vertical first
    { id: '9', startX: 75, startY: 100, hFirst: false },
    { id: '10', startX: 87.5, startY: 100, hFirst: false },
  ];

  // Calculate animation duration for each segment
  // Total time: 2s, split proportionally between horizontal and vertical segments
  const totalDuration = 2; // seconds
  const calculateSegmentDuration = (startX: number, startY: number, hFirst: boolean) => {
    const horizontalDist = Math.abs(centerX - startX);
    const verticalDist = Math.abs(centerY - startY);
    const totalDist = horizontalDist + verticalDist;
    
    if (hFirst) {
      return {
        horizontal: (horizontalDist / totalDist) * totalDuration,
        vertical: (verticalDist / totalDist) * totalDuration,
      };
    } else {
      return {
        vertical: (verticalDist / totalDist) * totalDuration,
        horizontal: (horizontalDist / totalDist) * totalDuration,
      };
    }
  };

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: '#05060A' }}
    >
      {/* FULL SCREEN MAP GRID */}
      <div className="absolute inset-0 z-0">
        <div className="grid grid-cols-8 grid-rows-8 gap-[4px] h-full w-full p-4">
          {[...Array(64)].map((_, i) => (
            <div
              key={i}
              className="rounded-[6px]"
              style={{
                backgroundColor: i % 3 === 0 ? '#1A1F2E' : i % 3 === 1 ? '#252B3A' : '#151923',
              }}
            />
          ))}
        </div>
      </div>

      {/* Static roads (dark) - full grid */}
      <div className="absolute inset-0 z-10">
        {/* Horizontal roads */}
        {roadPositions.map((pos) => (
          <div
            key={`h-${pos}`}
            className="absolute left-0 right-0 h-[2px] bg-[#121722] rounded-full"
            style={{ top: `${pos}%`, transform: 'translateY(-50%)' }}
          />
        ))}
        {/* Vertical roads */}
        {roadPositions.map((pos) => (
          <div
            key={`v-${pos}`}
            className="absolute top-0 bottom-0 w-[2px] bg-[#121722] rounded-full"
            style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
          />
        ))}
      </div>

      {/* Animated routes - all synchronized to reach center at same time */}
      <div className="absolute inset-0 z-20">
        {routes.map((route) => {
          const durations = calculateSegmentDuration(route.startX, route.startY, route.hFirst);
          const horizontalLength = Math.abs(centerX - route.startX);
          const verticalLength = Math.abs(centerY - route.startY);
          const isFromLeft = route.startX < centerX;
          const isFromTop = route.startY < centerY;
          
          if (route.hFirst) {
            // Horizontal first, then vertical
            return (
              <React.Fragment key={route.id}>
                {/* Horizontal segment */}
                <div
                  className="absolute h-[2px] overflow-hidden rounded-full"
                  style={{
                    left: `${Math.min(route.startX, centerX)}%`,
                    width: `${horizontalLength}%`,
                    top: `${route.startY}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background: isFromLeft
                        ? 'linear-gradient(to right, transparent, #02C97A, transparent)'
                        : 'linear-gradient(to left, transparent, #02C97A, transparent)',
                      animation: isFromLeft 
                        ? `route-converge-left-to-right ${durations.horizontal}s linear forwards`
                        : `route-converge-right-to-left ${durations.horizontal}s linear forwards`,
                    }}
                  />
                </div>
                {/* Vertical segment */}
                <div
                  className="absolute w-[2px] overflow-hidden rounded-full"
                  style={{
                    left: `${centerX}%`,
                    top: `${Math.min(route.startY, centerY)}%`,
                    height: `${verticalLength}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background: isFromTop
                        ? 'linear-gradient(to bottom, transparent, #02C97A, transparent)'
                        : 'linear-gradient(to top, transparent, #02C97A, transparent)',
                      animation: isFromTop
                        ? `route-converge-top-to-bottom ${durations.vertical}s linear forwards`
                        : `route-converge-bottom-to-top ${durations.vertical}s linear forwards`,
                      animationDelay: `${durations.horizontal}s`,
                    }}
                  />
                </div>
              </React.Fragment>
            );
          } else {
            // Vertical first, then horizontal
            return (
              <React.Fragment key={route.id}>
                {/* Vertical segment */}
                <div
                  className="absolute w-[2px] overflow-hidden rounded-full"
                  style={{
                    left: `${route.startX}%`,
                    top: `${Math.min(route.startY, centerY)}%`,
                    height: `${verticalLength}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background: isFromTop
                        ? 'linear-gradient(to bottom, transparent, #02C97A, transparent)'
                        : 'linear-gradient(to top, transparent, #02C97A, transparent)',
                      animation: isFromTop
                        ? `route-converge-top-to-bottom ${durations.vertical}s linear forwards`
                        : `route-converge-bottom-to-top ${durations.vertical}s linear forwards`,
                    }}
                  />
                </div>
                {/* Horizontal segment */}
                <div
                  className="absolute h-[2px] overflow-hidden rounded-full"
                  style={{
                    left: `${Math.min(route.startX, centerX)}%`,
                    width: `${horizontalLength}%`,
                    top: `${centerY}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background: isFromLeft
                        ? 'linear-gradient(to right, transparent, #02C97A, transparent)'
                        : 'linear-gradient(to left, transparent, #02C97A, transparent)',
                      animation: isFromLeft
                        ? `route-converge-left-to-right ${durations.horizontal}s linear forwards`
                        : `route-converge-right-to-left ${durations.horizontal}s linear forwards`,
                      animationDelay: `${durations.vertical}s`,
                    }}
                  />
                </div>
              </React.Fragment>
            );
          }
        })}
      </div>

      {/* Destination pin - pulsates only after routes reach it (2s delay) */}
      <div className="absolute inset-0 flex items-center justify-center z-30">
        <div 
          className="w-8 h-8 rounded-full bg-[#02C97A]/10"
          style={{
            animation: 'dot-pulse 1.5s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <div 
          className="absolute w-4 h-4 rounded-full bg-[#02C97A]/25"
          style={{
            animation: 'dot-pulse 1.5s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <div 
          className="absolute w-2 h-2 rounded-full bg-[#02C97A]"
          style={{
            animation: 'dot-pulse 1.5s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
      </div>
    </div>
  );
};

export default FindingBenjamin;

