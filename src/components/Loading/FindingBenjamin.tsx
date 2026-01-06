import React, { useMemo } from 'react';

type FindingBenjaminProps = {
  message?: string;
  subtitle?: string;
  isFullscreen?: boolean;
};

// Mapbox 3D building palette (matches RunnerDirectionsMap.tsx:add3DBuildingsLayer)
// Dark map canvas (less "blue", closer to Mapbox dark)
const MAP_BG = "#0b0f14";
const BUILDING_COLORS = ["#1A1A1A", "#252525", "#2A2A2A"];
const ROUTE_GREEN = "#13F287"; // Matches Mapbox route color

export const FindingBenjamin: React.FC<FindingBenjaminProps> = ({ isFullscreen = false }) => {
  // ROUTES CONFIGURATION
  // 4 lines from 4 different quadrants, all converging to center at the same time
  // Each route will have a multi-turn Manhattan path with exactly 80 units total length
  const routes = [
    // 1. TOP-LEFT QUADRANT
    { id: 1, start: { x: 10, y: 10 } },
    
    // 2. TOP-RIGHT QUADRANT
    { id: 2, start: { x: 90, y: 10 } },
    
    // 3. BOTTOM-LEFT QUADRANT
    { id: 3, start: { x: 30, y: 130 } },
    
    // 4. BOTTOM-RIGHT QUADRANT
    { id: 4, start: { x: 90, y: 90 } },
  ];

  // Seeded deterministic pseudo-random helper
  const seeded = (seed: number) => {
    let t = seed + 0x6D2B79F5;
    return () => {
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // Manhattan distance helper
  const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  // Road lattice: fixed set of allowed x/y lines that align with grid
  const ROAD_LINES = [-10, 10, 30, 50, 70, 90, 110, 130];

  const nearestRoad = (v: number) => {
    let best = ROAD_LINES[0];
    let bestD = Infinity;
    for (const r of ROAD_LINES) {
      const d = Math.abs(v - r);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  };

  const snapToRoadPoint = (p: { x: number; y: number }) => ({
    x: nearestRoad(p.x),
    y: nearestRoad(p.y),
  });

  const clampToView = (p: { x: number; y: number }) => ({
    x: clamp(p.x, -10, 110),
    y: clamp(p.y, -10, 110),
  });

  // Generate deterministic Manhattan polyline paths that STAY ON ROADS and always end at center
  const makeRoadPath = (startRaw: { x: number; y: number }, id: number) => {
    const rnd = seeded(id * 999);

    // Center must be EXACT for convergence into the dot
    const centerPt = { x: 50, y: 50 };

    // Snap start to the road lattice so it never cuts through "buildings"
    const start = clampToView(snapToRoadPoint(startRaw));

    // All lines must have the SAME total Manhattan length so they arrive together
    const TOTAL = 80;

    const pts: { x: number; y: number }[] = [start];
    let cur = { ...start };
    let used = 0;

    // Axis-aligned push: never allows diagonal SVG segments.
    const push = (p: { x: number; y: number }) => {
      const next = clampToView(snapToRoadPoint(p));
      if (next.x === cur.x && next.y === cur.y) return;

      // NEVER allow diagonal segments in the SVG path.
      // If both axes change, insert a manhattan corner first.
      if (next.x !== cur.x && next.y !== cur.y) {
        // Pick a deterministic corner so paths look organic but stable.
        // (Alternates corner choice by route id + current step count.)
        const cornerFirstX = ((id + pts.length) % 2) === 0;
        const corner = cornerFirstX
          ? clampToView(snapToRoadPoint({ x: next.x, y: cur.y }))
          : clampToView(snapToRoadPoint({ x: cur.x, y: next.y }));

        // Corner may still be same point after snapping/clamping, so guard.
        if (corner.x !== cur.x || corner.y !== cur.y) {
          used += manhattan(cur, corner);
          pts.push(corner);
          cur = corner;
        }
      }

      // Now push the final point (single-axis or after corner)
      if (next.x === cur.x && next.y === cur.y) return;
      used += manhattan(cur, next);
      pts.push(next);
      cur = next;
    };

    // Quadrant-aware corridors to avoid mirrored shapes that read like a swastika.
    const style = id % 4;
    const left = start.x < centerPt.x;
    const top = start.y < centerPt.y;

    // Outer roads help break symmetry (more like "different streets" approaching the same target).
    const outerX = left ? 10 : 90;
    const outerY = top ? 10 : 90;

    // Inner corridors closer to center; choose based on quadrant so each route differs.
    const innerX = left ? 30 : 70;
    const innerY = top ? 30 : 70;

    // 1) Small outer drift (deterministic per route) to avoid all paths forming the same central hook.
    const drift = (style === 0 || style === 2)
      ? { x: outerX, y: cur.y }
      : { x: cur.x, y: outerY };

    // 2) Move onto one inner corridor (still quadrant-shaped, not mirrored).
    const corridor1 = (style === 0 || style === 1)
      ? { x: innerX, y: cur.y }
      : { x: cur.x, y: innerY };

    // 3) Add a second bend that approaches the center from a different street than the drift.
    // This creates more "S" variety and avoids the iconic swastika silhouette.
    const corridor2 = (style === 0 || style === 3)
      ? { x: innerX, y: innerY }
      : { x: centerPt.x, y: innerY };

    // 4) Optional kink on an outer line, but keep it away from the center cross.
    // Use only outer lines (10/90) here to reduce central symmetry.
    const kinkOptions = [10, 90];
    const kink = kinkOptions[Math.floor(rnd() * kinkOptions.length)];
    const kinkPt = (style === 0 || style === 3)
      ? { x: kink, y: corridor2.y }
      : { x: corridor2.x, y: kink };

    // Compute required distance from any point to center
    const distToCenter = (p: { x: number; y: number }) => manhattan(p, centerPt);

    // Add waypoints BUT never exceed TOTAL - (min distance to center)
    // This guarantees we can finish exactly at center
    const tryPush = (p: { x: number; y: number }) => {
      const snapped = clampToView(snapToRoadPoint(p));
      const d = manhattan(cur, snapped);
      const minFinish = distToCenter(snapped);
      // If taking this step would leave us without enough budget to reach center, skip it
      if (used + d + minFinish > TOTAL) return false;
      push(snapped);
      return true;
    };

    tryPush(drift);
    tryPush(corridor1);
    tryPush(corridor2);
    tryPush(kinkPt);

    // Budget equalization loop: consume extra budget with road-like detours
    while (true) {
      const need = distToCenter(cur);
      const remaining = TOTAL - used;
      const extra = remaining - need;
      if (extra <= 0) break;

      const step = 20;

      // Consume extra in chunks of 40+ (rectangle detour)
      if (extra >= 40) {
        const dirX = rnd() > 0.5 ? step : -step;
        const dirY = rnd() > 0.5 ? step : -step;

        const a = { x: clampToView({ x: cur.x + dirX, y: cur.y }).x, y: cur.y };
        const b = { x: a.x, y: clampToView({ x: a.x, y: a.y + dirY }).y };
        const c = { x: cur.x, y: b.y };

        // Try to add rectangle detour, rollback if it fails
        const beforeUsed = used;
        const beforePtsLength = pts.length;
        const ok1 = tryPush(a);
        const ok2 = ok1 ? tryPush(b) : false;
        const ok3 = ok2 ? tryPush(c) : false;
        if (!ok3) {
          // Roll back: restore state
          used = beforeUsed;
          pts.length = beforePtsLength;
          cur = pts[pts.length - 1];
          break;
        }
      } else {
        break;
      }
    }

    // Final approach to center: spend any remaining extra budget before final segments
    const finishNeed = distToCenter(cur);
    const finishRemaining = TOTAL - used;
    const finishExtra = finishRemaining - finishNeed;

    if (finishExtra > 0) {
      // Spend extra by moving along a road line before final approach
      const step = 20;
      const moves = Math.floor(finishExtra / step);
      if (moves > 0) {
        const axisX = rnd() > 0.5;
        const dir = rnd() > 0.5 ? 1 : -1;
        const delta = dir * step * moves;
        const drift = axisX
          ? { x: cur.x + delta, y: cur.y }
          : { x: cur.x, y: cur.y + delta };
        // Only drift if it still allows reaching center within budget
        tryPush(drift);
      }
    }

    // Final 2 orthogonal segments into exact center (no randomness)
    // Ensure we have exactly the right distance remaining
    const finalNeed = distToCenter(cur);
    const finalRemaining = TOTAL - used;
    
    // If we have exactly the right amount, proceed
    // If we have extra, we already tried to spend it above
    // If we're short, we need to adjust (shouldn't happen with proper budget management)
    if (finalRemaining >= finalNeed) {
      // Final approach: always 2 segments
      if (style === 0 || style === 1) {
        // Approach horizontally first, then vertically
        const midX = centerPt.x;
        const midY = cur.y;
        const dist1 = manhattan(cur, { x: midX, y: midY });
        const dist2 = manhattan({ x: midX, y: midY }, centerPt);
        
        if (used + dist1 + dist2 <= TOTAL) {
          push({ x: midX, y: midY });
          push(centerPt);
        } else {
          // Direct approach if budget is tight
          push(centerPt);
        }
      } else {
        // Approach vertically first, then horizontally
        const midX = cur.x;
        const midY = centerPt.y;
        const dist1 = manhattan(cur, { x: midX, y: midY });
        const dist2 = manhattan({ x: midX, y: midY }, centerPt);
        
        if (used + dist1 + dist2 <= TOTAL) {
          push({ x: midX, y: midY });
          push(centerPt);
    } else {
          // Direct approach if budget is tight
          push(centerPt);
        }
      }
    }

    // Safety: ensure we end EXACTLY at center
    pts[pts.length - 1] = centerPt;

    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  };

  // Memoize paths so they don't change between renders
  const pathData = useMemo(() => {
    return routes.map(route => ({
      id: route.id,
      d: makeRoadPath(route.start, route.id)
    }));
  }, []); // Empty deps - paths are deterministic based on route.id

  // In half-screen mode, constrain to visible 50vh area (top half only)
  // In fullscreen mode, use full height
  const containerClasses = isFullscreen 
    ? "absolute inset-0 w-full h-full overflow-hidden"
    : "absolute top-0 left-0 right-0 w-full h-[50vh] overflow-hidden";

  return (
    <div className={containerClasses} style={{ backgroundColor: MAP_BG }}>
      {/* Subtle vignette / depth like a real map canvas */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 30%, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.0) 38%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* 1. BACKGROUND GRID (Fake Buildings - Matches Mapbox 3D Building Palette) */}
      <div className="absolute inset-0 z-0">
        <div
          className="grid grid-cols-8 grid-rows-8 gap-[4px] h-full w-full p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          {[...Array(64)].map((_, i) => {
            // Deterministic random pick per tile (stable across renders, but feels random)
            const r = seeded(1337 + i * 97)();
            const colorIndex = Math.floor(r * BUILDING_COLORS.length);
            const buildingColor = BUILDING_COLORS[colorIndex];
            
            // Subtle per-tile variance (still deterministic)
            const tileOpacity = 0.78 + r * 0.18; // 0.78–0.96
            const edgeAlpha = 0.03 + r * 0.05;   // 0.03–0.08
            
            return (
            <div
              key={i}
              className="rounded-[4px]"
              style={{
                  backgroundColor: buildingColor,
                  opacity: tileOpacity,
                  border: `1px solid rgba(255,255,255,${edgeAlpha})`,
                  boxShadow:
                    "inset 0 -1px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            />
            );
          })}
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
        {pathData.map((path) => (
          <path
            key={path.id}
            d={path.d}
            fill="none"
            stroke={ROUTE_GREEN}
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
        <div className="w-3 h-3 rounded-full shadow-[0_0_15px] animate-dot-impact" style={{ backgroundColor: ROUTE_GREEN, boxShadow: `0 0 15px ${ROUTE_GREEN}` }} />
        {/* The Shockwaves */}
        <div className="absolute w-full h-full max-w-[300px] max-h-[300px] flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full animate-radar-shockwave" style={{ backgroundColor: `${ROUTE_GREEN}30` }} />
          <div className="absolute w-20 h-20 rounded-full animate-radar-shockwave" style={{ backgroundColor: `${ROUTE_GREEN}20`, animationDelay: '0.1s' }} />
        </div>
      </div>
    </div>
  );
};

export default FindingBenjamin;
