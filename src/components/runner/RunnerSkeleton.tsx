import { Skeleton } from "@/components/ui/skeleton";
import { ShellCard } from "@/components/ui/ShellCard";
import { cn } from "@/lib/utils";

/**
 * Runner-specific skeleton components for dark theme
 */

// Runner skeleton with dark theme colors
export function RunnerSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-slate-800/50 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

// Online/Offline card skeleton
export function OnlineCardSkeleton() {
  return (
    <ShellCard variant="runner" className="bg-[#0B1020] border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <RunnerSkeleton className="h-4 w-4 rounded-full" />
            <RunnerSkeleton className="h-4 w-20" />
          </div>
          <RunnerSkeleton className="h-3 w-48 mt-2" />
        </div>
        <RunnerSkeleton className="h-6 w-11 rounded-full" />
      </div>
    </ShellCard>
  );
}

// Active Delivery card skeleton
export function ActiveDeliverySkeleton() {
  return (
    <ShellCard variant="runner" className="hover:border-indigo-500/30 transition-all">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <RunnerSkeleton className="h-8 w-32 mb-2" />
            <RunnerSkeleton className="h-5 w-24" />
          </div>
          <RunnerSkeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Customer Info skeleton */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
          <RunnerSkeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <RunnerSkeleton className="h-4 w-32" />
            <RunnerSkeleton className="h-3 w-40" />
          </div>
        </div>

        <RunnerSkeleton className="h-10 w-full rounded-lg" />
      </div>
    </ShellCard>
  );
}

// Available Request card skeleton
export function AvailableRequestSkeleton() {
  return (
    <ShellCard variant="runner" className="hover:border-indigo-500/30 transition-all">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <RunnerSkeleton className="h-8 w-32 mb-2" />
            <RunnerSkeleton className="h-5 w-24" />
          </div>
          <RunnerSkeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-2">
          <RunnerSkeleton className="h-3 w-full" />
          <RunnerSkeleton className="h-3 w-3/4" />
        </div>

        <div className="flex gap-2">
          <RunnerSkeleton className="h-10 flex-1 rounded-lg" />
          <RunnerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </ShellCard>
  );
}

// Earnings summary card skeleton
export function EarningsSummarySkeleton() {
  return (
    <div className="rounded-3xl bg-[#050816] border border-white/5 px-3 py-3 flex flex-col">
      <RunnerSkeleton className="h-3 w-16 mb-2" />
      <RunnerSkeleton className="h-7 w-20 mb-1" />
      <RunnerSkeleton className="h-2 w-24" />
    </div>
  );
}

// Payout card skeleton
export function PayoutCardSkeleton() {
  return (
    <div className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <RunnerSkeleton className="h-3 w-24" />
        <RunnerSkeleton className="h-5 w-16 rounded-full" />
      </div>
      <RunnerSkeleton className="h-5 w-32 mb-1" />
      <RunnerSkeleton className="h-3 w-40" />
    </div>
  );
}

// Earnings history item skeleton
export function EarningsHistoryItemSkeleton() {
  return (
    <div className="rounded-3xl bg-[#050816] border border-white/5 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <RunnerSkeleton className="h-4 w-24 mb-1" />
          <RunnerSkeleton className="h-3 w-32" />
        </div>
        <div className="text-right">
          <RunnerSkeleton className="h-5 w-20 mb-1" />
          <RunnerSkeleton className="h-4 w-16" />
        </div>
      </div>
      <RunnerSkeleton className="h-3 w-16 rounded-full" />
    </div>
  );
}

// Profile card skeleton (for More page)
export function ProfileCardSkeleton() {
  return (
    <ShellCard variant="runner">
      <div className="flex items-center gap-4">
        <RunnerSkeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <RunnerSkeleton className="h-5 w-32" />
          <RunnerSkeleton className="h-4 w-40" />
        </div>
        <RunnerSkeleton className="h-5 w-5" />
      </div>
    </ShellCard>
  );
}

// Menu item skeleton (for More page)
export function MenuItemSkeleton() {
  return (
    <ShellCard variant="runner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RunnerSkeleton className="h-5 w-5" />
          <RunnerSkeleton className="h-4 w-24" />
        </div>
        <RunnerSkeleton className="h-5 w-5" />
      </div>
    </ShellCard>
  );
}

