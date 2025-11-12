import React from "react";

// Conditionally import Lottie only if available
let Lottie: any = null;
try {
  Lottie = require("lottie-react").default;
} catch (e) {
  console.warn("lottie-react not installed, AnimatedIcon will render placeholder");
}

// Try to import animation JSON files, but don't fail if they don't exist
let account: any = null;
let analytics: any = null;
let bolt: any = null;
let calculate: any = null;
let chat: any = null;
let creditCard: any = null;
let home: any = null;
let locationAdd: any = null;
let locationDone: any = null;
let lock: any = null;
let logout: any = null;
let moneyCash: any = null;
let pieChart: any = null;
let settings: any = null;
let star: any = null;
let verified: any = null;
let work: any = null;

try {
  account = require("@/assets/animations/system-regular-4-account-hover-account.json");
} catch (e) {}
try {
  analytics = require("@/assets/animations/system-regular-10-analytics-hover-analytics.json");
} catch (e) {}
try {
  bolt = require("@/assets/animations/system-regular-117-bolt-hover-bolt.json");
} catch (e) {}
try {
  calculate = require("@/assets/animations/system-regular-197-calculate-hover-calculate.json");
} catch (e) {}
try {
  chat = require("@/assets/animations/system-regular-47-chat-hover-chat.json");
} catch (e) {}
try {
  creditCard = require("@/assets/animations/system-regular-38-credit-card-hover-card.json");
} catch (e) {}
try {
  home = require("@/assets/animations/system-regular-41-home-hover-pinch.json");
} catch (e) {}
try {
  locationAdd = require("@/assets/animations/system-regular-132-location-add-hover-add.json");
} catch (e) {}
try {
  locationDone = require("@/assets/animations/system-regular-133-location-done-hover-pinch.json");
} catch (e) {}
try {
  lock = require("@/assets/animations/system-regular-90-lock-closed-hover-pinch.json");
} catch (e) {}
try {
  logout = require("@/assets/animations/system-regular-112-log-sign-out-hover-log-out.json");
} catch (e) {}
try {
  moneyCash = require("@/assets/animations/system-regular-115-money-cash-hover-cash.json");
} catch (e) {}
try {
  pieChart = require("@/assets/animations/system-regular-43-pie-chart-diagram-hover-pie-chart.json");
} catch (e) {}
try {
  settings = require("@/assets/animations/system-regular-63-settings-cog-hover-cog-1.json");
} catch (e) {}
try {
  star = require("@/assets/animations/system-regular-95-star-hover-pinch.json");
} catch (e) {}
try {
  verified = require("@/assets/animations/system-regular-126-verified-hover-verified.json");
} catch (e) {}
try {
  work = require("@/assets/animations/system-regular-178-work-hover-work.json");
} catch (e) {}

const animations = {
  account,
  analytics,
  bolt,
  calculate,
  chat,
  creditCard,
  home,
  locationAdd,
  locationDone,
  lock,
  logout,
  moneyCash,
  pieChart,
  settings,
  star,
  verified,
  work,
} as const;

export type AnimatedIconName = keyof typeof animations;

interface AnimatedIconProps {
  name: AnimatedIconName;
  className?: string;
  loop?: boolean;
  /**
   * If true: only plays on hover (desktop) or on mount once (mobile-like).
   * Default: subtle, single play on mount.
   */
  interactive?: boolean;
  /**
   * Custom size override (defaults to 24px)
   */
  size?: number;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  name,
  className,
  loop = false,
  interactive = false,
  size = 24,
}) => {
  // If Lottie is not available, return a placeholder div
  if (!Lottie) {
    return (
      <div
        className={className}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-label={name}
      />
    );
  }

  const animationData = animations[name];
  if (!animationData) {
    // Return placeholder if animation data not found
    return (
      <div
        className={className}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-label={name}
      />
    );
  }

  const [hovered, setHovered] = React.useState(false);
  const [hasPlayed, setHasPlayed] = React.useState(false);

  // For interactive icons: play on hover (desktop) or once on mount (mobile-like)
  // For non-interactive: play once on mount
  const shouldPlay = interactive ? hovered : !hasPlayed;
  const shouldLoop = interactive ? hovered && loop : loop;

  React.useEffect(() => {
    if (!interactive && !hasPlayed) {
      // Mark as played after a short delay to allow animation to start
      const timer = setTimeout(() => setHasPlayed(true), 100);
      return () => clearTimeout(timer);
    }
  }, [interactive, hasPlayed]);

  const handleMouseEnter = () => {
    if (interactive) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHovered(false);
    }
  };

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Lottie
        animationData={animationData}
        loop={shouldLoop}
        autoplay={shouldPlay}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

AnimatedIcon.displayName = "AnimatedIcon";

