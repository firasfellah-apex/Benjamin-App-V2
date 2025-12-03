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
      className: "", // Custom inline styles used instead
      style: {
        backgroundColor: '#E5FBF2',
        color: '#047857',
        borderColor: '#13F287'
      },
    },
    cancelled: {
      label: "Cancelled",
      className: "", // Custom inline styles used instead
      style: {
        backgroundColor: '#FEE5E7',
        color: '#E84855',
        borderColor: '#E84855'
      },
    },
    issue_reported: {
      label: "Issue Reported",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      style: undefined,
    },
    incomplete: {
      label: "Incomplete",
      className: "bg-slate-50 text-slate-700 border-slate-200",
      style: undefined,
    },
  };

  const { label, className: statusClassName, style } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium border",
        statusClassName,
        className
      )}
      style={style}
    >
      {label}
    </span>
  );
}

