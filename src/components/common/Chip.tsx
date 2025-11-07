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

interface ChipProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'Pending': {
    variant: 'outline',
    label: 'Pending'
  },
  'Runner Accepted': {
    variant: 'secondary',
    label: 'Accepted'
  },
  'Runner at ATM': {
    variant: 'secondary',
    label: 'At ATM'
  },
  'Cash Withdrawn': {
    variant: 'default',
    label: 'Cash Picked'
  },
  'Pending Handoff': {
    variant: 'default',
    label: 'En Route'
  },
  'Completed': {
    variant: 'default',
    label: 'Delivered'
  },
  'Cancelled': {
    variant: 'destructive',
    label: 'Cancelled'
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
