import React from "react";
import { useLocation } from "react-router-dom";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";
import { Skeleton } from "@/components/common/Skeleton";

type Props = {
  loading?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  stepKey?: string; // Optional step key override (defaults to route-based)
  backButton?: React.ReactNode; // Optional back button to show above title
};

/**
 * Top shelf content section with global transition pattern.
 * 
 * - Uses TopShelfContentTransition for consistent fade/slide between steps
 * - No layoutId/layout animations across steps
 * - Fixed min-heights to prevent shrink-then-grow
 * - Simple skeletons that respect slot heights
 */
export default function TopShelfSection({
  loading,
  title,
  subtitle,
  actions,
  children,
  stepKey,
  backButton,
}: Props) {
  const location = useLocation();
  const shelf = useTopShelfTransition({ minBase: 168, settleDelayMs: 240 });

  // Determine step key from route or prop
  const currentStepKey = stepKey || (() => {
    const path = location.pathname;
    if (path.includes("/customer/home")) return "home";
    if (path.includes("/customer/request")) {
      // Check if we're on step 2 (amount) - this will be passed as stepKey from CashRequest
      return "address"; // Default to address, CashRequest will override
    }
    if (path.includes("/customer/addresses")) return "address";
    return "home";
  })();

  // Show skeleton during reserve phase or when data is loading
  // Only show skeleton for title if we're in reserve phase OR if loading AND not in idle/swap
  // But exclude swap phase to prevent flicker when content is transitioning
  const showSkeleton = shelf.phase === "reserve" || (loading && shelf.phase !== "idle" && shelf.phase !== "swap" && shelf.phase !== "settle");

  return (
    <>
      {/* Back button - above title */}
      {backButton && (
        <div className="mb-2">
          {backButton}
        </div>
      )}
      
      {/* Title row - no layout animations, just static */}
      {/* No mb-* here - spacing comes from parent space-y-6 */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          {showSkeleton ? (
            <>
              <div className="h-7 w-2/5 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-1/4 animate-pulse rounded bg-slate-100" />
            </>
          ) : (
            <>
              {title ? (
                <h1 className="text-[22px] sm:text-[24px] font-semibold leading-tight tracking-tight text-slate-900">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="text-[16px] sm:text-[17px] text-slate-500 leading-snug">
                  {subtitle}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0">
          {showSkeleton ? (
            <div className="h-12 w-44 animate-pulse rounded-full bg-slate-100" />
          ) : (
            actions
          )}
        </div>
      </header>

      {/* Content wrapper we measure - no transitions */}
      {/* No space-y-* here - spacing comes from parent space-y-6 in CustomerTopShelf */}
      <div ref={shelf.measureRef}>
        {shelf.phase === "reserve" ? (
          // Skeleton placeholder - same height as content
          <div className="space-y-4" style={{ minHeight: "180px" }}>
            <div className="h-5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-slate-100" />
            <div className="h-12 w-44 animate-pulse rounded-full bg-slate-100" />
          </div>
        ) : (
          <div>
            {children}
          </div>
        )}
      </div>
    </>
  );
}

