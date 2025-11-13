/**
 * StatusBadge Component
 * 
 * Displays delivery status with appropriate styling
 */

import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/types/delivery";

interface StatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    delivered: {
      label: "Delivered",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    issue_reported: {
      label: "Issue Reported",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    incomplete: {
      label: "Incomplete",
      className: "bg-slate-50 text-slate-700 border-slate-200",
    },
  };

  const { label, className: statusClassName } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium border",
        statusClassName,
        className
      )}
    >
      {label}
    </span>
  );
}

