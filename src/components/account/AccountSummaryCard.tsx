/**
 * AccountSummaryCard Component
 * 
 * Displays identity verification status and customer rating in a clean card format.
 * Used on the Account page to show account status information.
 * Uses the same pill-style UI as the menu for consistency.
 */

import { CheckCircle2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AccountSummaryCardProps {
  isVerified: boolean; // Identity verification status (based on bank connection)
  ratingAvg?: number | null;
  ratingCount?: number | null;
  isLoadingRating?: boolean;
}

export function AccountSummaryCard({
  isVerified,
  ratingAvg,
  ratingCount = 0,
  isLoadingRating = false,
}: AccountSummaryCardProps) {
  const navigate = useNavigate();

  const handleNotVerifiedClick = () => {
    navigate("/customer/banks");
  };

  return (
    <div className="space-y-4">
      {/* Identity Row */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-gray-900">Identity</span>
        <div className="flex flex-col items-end gap-0.5">
          {isVerified ? (
            <>
              {/* Verified pill - same style as menu, with tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal",
                      "bg-emerald-50 text-emerald-700",
                      "hover:bg-emerald-100 active:bg-emerald-200",
                      "transition-colors cursor-pointer"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black text-white text-xs rounded-lg shadow-lg w-max max-w-xs px-3 py-2.5 border-0 z-[100]"
                >
                  <p className="leading-relaxed">Your identity has been confirmed.</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              {/* Not verified pill - clickable, same style as menu */}
              <button
                onClick={handleNotVerifiedClick}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal",
                  "bg-amber-50 text-amber-700",
                  "hover:bg-amber-100 active:bg-amber-200",
                  "transition-colors cursor-pointer"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Not verified
              </button>
              {/* Subtext */}
              <span className="text-xs text-slate-400">
                Connect a bank to verify your identity.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Rating Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Rating</span>
        <div className="flex flex-col items-end gap-0.5">
          {isLoadingRating ? (
            <span className="text-sm font-medium text-slate-400">Loading...</span>
          ) : (
            <>
              {/* Use same pill style as menu */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-normal" style={{ backgroundColor: '#FFFBEB', color: '#F2AB58' }}>
                  <Star className="h-3.5 w-3.5 fill-[#F2AB58]" style={{ color: '#F2AB58' }} />
                  <span>
                    {ratingCount === 0
                      ? "New"
                      : ratingCount >= 5 && ratingAvg !== null
                      ? ratingAvg.toFixed(1)
                      : "New"}
                  </span>
                </span>
                {/* Show count in muted text for ratings >= 5 */}
                {ratingCount >= 5 && ratingAvg !== null && (
                  <span className="text-xs text-slate-400">({ratingCount})</span>
                )}
              </div>
              {/* Show subtext below pill for new users */}
              {ratingCount < 5 && (
                <>
                  {ratingCount === 0 && (
                    <span className="text-xs text-slate-400">Not enough ratings yet</span>
                  )}
                  {ratingCount >= 1 && ratingCount < 5 && (
                    <span className="text-xs text-slate-400">Based on a few trips</span>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

