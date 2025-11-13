import React from "react";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/40",
      className
    )}
    aria-hidden
  />
);

export const SkeletonTitle = ({ lines = 1 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn("h-7", i === 0 ? "w-[70%]" : "w-[40%]")} />
    ))}
  </div>
);

export const SkeletonText = ({ lines = 2 }: { lines?: number }) => (
  <div className="space-y-2 mt-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-[55%]" : "w-full")} />
    ))}
  </div>
);

export const SkeletonButton = () => (
  <Skeleton className="h-12 w-40 rounded-full" />
);

