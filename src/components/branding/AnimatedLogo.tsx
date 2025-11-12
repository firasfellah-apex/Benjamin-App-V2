import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AnimatedLogoProps = {
  size?: number;
  loop?: boolean;
  className?: string;
  variant?: 'customer' | 'runner' | 'admin';
};

/**
 * Animated Benjamin Logo
 * 
 * Animated version of the Benjamin logo featuring:
 * - Two black "C" arcs suggesting the S shape of a dollar sign
 * - Two green pills that animate out from inside the C shapes
 * - Motion blur gradient effects during animation
 * - The vertical stroke is implied as negative space (not drawn)
 * 
 * Uses CSS animations for compatibility (no framer-motion required)
 */
export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  size = 64,
  loop = false,
  className,
  variant = 'customer',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const uniqueId = React.useId().replace(/:/g, '-');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Theme-based stroke color
  const strokeColor = {
    customer: '#020202', // Black for light backgrounds
    runner: '#F9FAFB', // White for dark backgrounds
    admin: '#F1F3F5', // Light gray for dark backgrounds
  }[variant];

  return (
    <>
      <style>{`
        @keyframes pillSlideTop-${uniqueId} {
          0% {
            transform: translate(130px, 230px) scale(0.4);
            opacity: 0;
          }
          23% {
            opacity: 1;
          }
          23.33% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pillSlideBottom-${uniqueId} {
          0% {
            transform: translate(-130px, -230px) scale(0.4);
            opacity: 0;
          }
          23% {
            opacity: 1;
          }
          23.33% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes blurFade-${uniqueId} {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        .pill-top-${uniqueId} {
          ${loop 
            ? `animation: pillSlideTop-${uniqueId} 3s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s infinite;`
            : `animation: pillSlideTop-${uniqueId} 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) ${isMounted ? '0.1s' : '0s'} forwards;`}
        }
        
        .pill-bottom-${uniqueId} {
          ${loop 
            ? `animation: pillSlideBottom-${uniqueId} 3s cubic-bezier(0.25, 0.8, 0.25, 1) 0.25s infinite;`
            : `animation: pillSlideBottom-${uniqueId} 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) ${isMounted ? '0.25s' : '0s'} forwards;`}
        }
        
        .blur-top-${uniqueId} {
          animation: ${loop ? `blurFade-${uniqueId} 0.4s ease-in-out infinite` : 'none'};
        }
        
        .blur-bottom-${uniqueId} {
          animation: ${loop ? `blurFade-${uniqueId} 0.4s ease-in-out 0.15s infinite` : 'none'};
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        className={cn("block", className)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Motion blur gradient for top pill */}
          <linearGradient
            id={`pillGradientTop-${uniqueId}`}
            x1="28.3305"
            y1="1.48974"
            x2="30.7238"
            y2="132.76"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60.5769%" stopColor="#00C839" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00C839" stopOpacity="1" />
          </linearGradient>

          {/* Motion blur gradient for bottom pill */}
          <linearGradient
            id={`pillGradientBottom-${uniqueId}`}
            x1="28.3305"
            y1="1.51267"
            x2="30.798"
            y2="134.802"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60.5769%" stopColor="#00C839" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00C839" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Two C-shaped arcs (the main logo structure) - filled paths */}
        <g>
          {/* Top C arc */}
          <path d="M276.653 383.43L277.509 383.255C281.354 382.479 286.22 381.188 289.406 380.095C311.125 372.664 322.573 356.16 321.439 333.922C320.582 317.155 312.496 304.748 295.886 294.712C292.265 292.527 284.065 288.51 279.698 286.786L276.843 285.655L276.744 251.931C276.668 225.011 276.744 218.238 277.125 218.367C277.391 218.455 280.859 219.467 284.842 220.617C331.028 233.976 357.126 249.631 373.18 273.624C378.62 281.749 383.798 294.053 386.059 304.226C389.592 320.133 389.878 339.621 386.824 356.384C380.314 392.122 358.706 419.572 325.718 434.009C313.284 439.453 299.807 443.146 285.329 445.08C282.127 445.506 278.865 445.944 278.08 446.051L276.653 446.241V383.43ZM223.164 269.771C222.955 269.695 218.413 268.412 213.075 266.916C201.841 263.764 187.877 259.191 179.954 256.073C167.452 251.151 154.47 244.161 145.973 237.776C126.324 223.016 115.596 204.296 112.497 179.351C111.755 173.385 111.881 157.186 112.714 150.988C117.416 116.118 136.257 89.4945 167.395 73.7138C181.759 66.4345 197.337 61.8507 215.862 59.4445C219.174 59.0143 222.3 58.6641 222.81 58.6641H223.735V121.067L222.307 121.315C198.875 125.35 184.656 135.649 180.274 151.749C179.078 156.147 179.078 165.253 180.278 169.643C183.312 180.764 191.234 189.063 205.652 196.221C210.178 198.467 220.16 202.533 222.688 203.161L223.735 203.42V236.691C223.735 254.988 223.693 269.946 223.64 269.931C223.586 269.916 223.373 269.844 223.164 269.771Z" fill={strokeColor} />
        </g>

        {/* Top pill group with motion blur rectangle */}
        <g className={`pill-top-${uniqueId}`} style={{ opacity: isMounted ? 1 : 0 }}>
          {/* Motion blur rectangle */}
          <rect
            width="64.4868"
            height="132.338"
            x="226.578"
            y="108.457"
            transform="rotate(-63 226.578 108.457)"
            fill={`url(#pillGradientTop-${uniqueId})`}
            fillOpacity="0.5"
            className={`blur-top-${uniqueId}`}
          />
          {/* Top green pill */}
          <ellipse
            cx="357.355"
            cy="138.809"
            rx="31.3241"
            ry="32.7267"
            fill="#00C839"
          />
        </g>

        {/* Bottom pill group with motion blur rectangle */}
        <g className={`pill-bottom-${uniqueId}`} style={{ opacity: isMounted ? 1 : 0 }}>
          {/* Motion blur rectangle */}
          <rect
            width="64.4868"
            height="134.375"
            x="276.062"
            y="392.258"
            transform="rotate(117 276.062 392.258)"
            fill={`url(#pillGradientBottom-${uniqueId})`}
            fillOpacity="0.5"
            className={`blur-bottom-${uniqueId}`}
          />
          {/* Bottom green pill */}
          <ellipse
            cx="143.324"
            cy="360.978"
            rx="31.3241"
            ry="32.7267"
            transform="rotate(-180 143.324 360.978)"
            fill="#00C839"
          />
        </g>
      </svg>
    </>
  );
};

