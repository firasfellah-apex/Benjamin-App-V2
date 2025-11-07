/**
 * Chip Component
 * 
 * Unified badge/chip component for status indicators
 * - Consistent styling across the app
 * - Multiple variants
 */

import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { strings } from '@/lib/strings';

interface ChipProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'Pending': {
    variant: 'outline',
    label: strings.status.pending
  },
  'Runner Accepted': {
    variant: 'secondary',
    label: strings.status.accepted
  },
  'Runner at ATM': {
    variant: 'secondary',
    label: strings.status.runnerAtATM
  },
  'Cash Withdrawn': {
    variant: 'default',
    label: strings.status.cashPicked
  },
  'Pending Handoff': {
    variant: 'default',
    label: strings.status.enRoute
  },
  'Completed': {
    variant: 'default',
    label: strings.status.delivered
  },
  'Cancelled': {
    variant: 'destructive',
    label: strings.status.canceled
  }
};

export function Chip({ status, className }: ChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn('transition-all', className)}
    >
      {config.label}
    </Badge>
  );
}
