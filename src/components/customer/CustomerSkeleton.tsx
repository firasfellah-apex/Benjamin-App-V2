import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Customer-specific skeleton components for light theme
 */

// Customer skeleton with light theme colors
export function CustomerSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-gray-200 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

// Address card skeleton (for Step 1)
export function AddressCardSkeleton() {
  return (
    <div className="w-full flex items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
      <CustomerSkeleton className="h-5 w-5 rounded" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomerSkeleton className="h-4 w-24" />
          <CustomerSkeleton className="h-4 w-16 rounded-full" />
        </div>
        <CustomerSkeleton className="h-3 w-48" />
        <CustomerSkeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// Cash amount input skeleton (for Step 2)
export function CashAmountInputSkeleton() {
  return (
    <div className="space-y-4">
      {/* Primary value skeleton */}
      <CustomerSkeleton className="h-16 w-32 mx-auto rounded-lg" />
      
      {/* Secondary text skeleton */}
      <CustomerSkeleton className="h-4 w-40 mx-auto rounded" />
      
      {/* Amount buttons skeleton */}
      <div className="flex justify-center gap-2 flex-wrap">
        <CustomerSkeleton className="h-10 w-20 rounded-lg" />
        <CustomerSkeleton className="h-10 w-20 rounded-lg" />
        <CustomerSkeleton className="h-10 w-20 rounded-lg" />
        <CustomerSkeleton className="h-10 w-24 rounded-lg" />
      </div>
      
      {/* Slider skeleton */}
      <div className="space-y-1">
        <CustomerSkeleton className="h-2 w-full rounded-lg" />
        <div className="flex justify-between">
          <CustomerSkeleton className="h-3 w-12 rounded" />
          <CustomerSkeleton className="h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

// Pricing summary skeleton (for Step 2)
export function PricingSummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <CustomerSkeleton className="h-4 w-24 rounded" />
        <CustomerSkeleton className="h-8 w-20 rounded" />
      </div>
      <div className="flex justify-between items-center">
        <CustomerSkeleton className="h-4 w-20 rounded" />
        <CustomerSkeleton className="h-6 w-24 rounded" />
      </div>
      <CustomerSkeleton className="h-3 w-32 rounded" />
      <CustomerSkeleton className="h-3 w-48 rounded" />
    </div>
  );
}

// Section title skeleton
export function SectionTitleSkeleton() {
  return <CustomerSkeleton className="h-5 w-32 rounded" />;
}

// Address selector skeleton (multiple address cards)
export function AddressSelectorSkeleton() {
  return (
    <div className="space-y-3">
      <AddressCardSkeleton />
      <AddressCardSkeleton />
    </div>
  );
}

// Manage addresses button skeleton
export function ManageAddressesButtonSkeleton() {
  return (
    <CustomerSkeleton className="w-full h-10 rounded-xl" />
  );
}

// Add address button skeleton
export function AddAddressButtonSkeleton() {
  return (
    <CustomerSkeleton className="w-full h-12 rounded-2xl" />
  );
}









