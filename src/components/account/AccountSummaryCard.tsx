/**
 * AccountSummaryCard Component
 * 
 * Displays bank connection status and customer rating in a clean card format.
 * Used on the Account page to show account status information.
 * Uses the same pill-style UI as the menu for consistency.
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
  return (
    <>
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
      <div className="border-t border-slate-200" />

      {/* Rating Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Rating</span>
        <div className="flex flex-col items-end gap-0.5">
          {isLoadingRating ? (
            <span className="text-sm font-medium text-slate-400">Loading...</span>
          ) : (
            <>
              {/* Use same pill style as menu */}
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
    </>
  );
}

