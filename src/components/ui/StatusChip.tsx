/**
 * StatusChip Component
 * 
 * Theme-aware status badge with semantic colors.
 * Maps order statuses to appropriate visual styles for customer and runner themes.
 * 
 * Usage:
 * - Customer: <StatusChip status="Pending" tone="customer" />
 * - Runner: <StatusChip status="Pending" tone="runner" />
 */

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/types";

type ThemeTone = 'customer' | 'runner';

interface StatusChipProps {
  status: OrderStatus | 'info';
  tone?: ThemeTone;
  children?: React.ReactNode;
  className?: string;
}

export function StatusChip({ 
  status, 
  tone = 'customer', 
  children,
  className 
}: StatusChipProps) {
  const isRunner = tone === 'runner';

  const getStatusStyle = (): { label: string; className: string } => {
    switch (status) {
      case 'Pending':
        return {
          label: 'Request received',
          className: isRunner
            ? 'bg-slate-800 text-slate-200 border-slate-600'
            : 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'Runner Accepted':
        return {
          label: 'Runner assigned',
          className: isRunner
            ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500/40'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'Runner at ATM':
        return {
          label: 'At ATM',
          className: isRunner
            ? 'bg-blue-900/60 text-blue-300 border-blue-500/40'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'Cash Withdrawn':
        return {
          label: 'On the way',
          className: isRunner
            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'Pending Handoff':
        return {
          label: 'Arrived',
          className: isRunner
            ? 'bg-indigo-900/40 text-indigo-200 border-indigo-500/40'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'Completed':
        return {
          label: 'Completed',
          className: isRunner
            ? 'bg-slate-900 text-emerald-300 border-emerald-500/40'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'Cancelled':
        return {
          label: 'Canceled',
          className: isRunner
            ? 'bg-red-900/50 text-red-300 border-red-500/40'
            : 'bg-red-50 text-red-600 border-red-200',
        };
      default:
        return {
          label: String(status),
          className: isRunner
            ? 'bg-slate-800 text-slate-200 border-slate-700'
            : 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const style = getStatusStyle();

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        style.className,
        className
      )}
    >
      {children ?? style.label}
    </span>
  );
}
