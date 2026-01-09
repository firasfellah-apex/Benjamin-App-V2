/**
 * AccountSummaryCard Component
 * 
 * Displays bank connection status and customer rating in a clean card format.
 * Used on the Account page to show account status information.
 */

import { CheckCircle2, Star } from "lucide-react";

interface AccountSummaryCardProps {
  bankConnected: boolean;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  isLoadingRating?: boolean;
}

export function AccountSummaryCard({
  bankConnected,
  ratingAvg,
  ratingCount = 0,
  isLoadingRating = false,
}: AccountSummaryCardProps) {
  // Determine rating display
  const getRatingDisplay = () => {
    if (isLoadingRating) {
      return {
        main: <span className="text-slate-400">Loading...</span>,
        subtext: null,
      };
    }

    if (ratingCount === 0) {
      return {
        main: <span>New</span>,
        subtext: "Not enough ratings yet",
      };
    }

    if (ratingCount >= 1 && ratingCount < 5) {
      return {
        main: <span>New</span>,
        subtext: "Based on a few trips",
      };
    }

    if (ratingCount >= 5 && ratingAvg !== null) {
      return {
        main: <>{ratingAvg.toFixed(1)} ★</>,
        subtext: `(${ratingCount})`,
      };
    }

    return {
      main: <span>New</span>,
      subtext: "Not enough ratings yet",
    };
  };

  const ratingDisplay = getRatingDisplay();

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-[18px] space-y-3">
      {/* Bank Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Bank</span>
        <div className="flex items-center gap-2">
          {bankConnected ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-900">Connected</span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-400">Not connected</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Rating Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Rating</span>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium text-slate-900">
              {ratingDisplay.main}
            </span>
          </div>
          {ratingDisplay.subtext && (
            <span className="text-xs text-slate-400">
              {ratingDisplay.subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

