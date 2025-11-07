/**
 * Order Timeline Component
 * 
 * Shows order progress through status steps
 * - Horizontal chips with animations
 * - Current step pulses
 * - Completed steps show checkmark and timestamp
 */

import { OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { Check, Clock, Package, MapPin, Banknote, HandCoins, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: 'Pending',
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    description: 'Waiting for runner'
  },
  {
    status: 'Runner Accepted',
    label: 'Accepted',
    icon: <Package className="h-4 w-4" />,
    description: 'Runner accepted'
  },
  {
    status: 'Runner at ATM',
    label: 'At ATM',
    icon: <MapPin className="h-4 w-4" />,
    description: 'Runner at ATM'
  },
  {
    status: 'Cash Withdrawn',
    label: 'Cash Picked',
    icon: <Banknote className="h-4 w-4" />,
    description: 'Cash withdrawn'
  },
  {
    status: 'Pending Handoff',
    label: 'En Route',
    icon: <HandCoins className="h-4 w-4" />,
    description: 'On the way'
  },
  {
    status: 'Completed',
    label: 'Delivered',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Delivery complete'
  }
];

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timestamps?: Partial<Record<OrderStatus, string>>;
  className?: string;
}

export function OrderTimeline({
  currentStatus,
  timestamps = {},
  className
}: OrderTimelineProps) {
  const currentIndex = TIMELINE_STEPS.findIndex(step => step.status === currentStatus);
  const isCancelled = currentStatus === 'Cancelled';

  const getStepState = (index: number): 'completed' | 'current' | 'upcoming' | 'cancelled' => {
    if (isCancelled) return 'cancelled';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Timeline Steps */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {TIMELINE_STEPS.map((step, index) => {
          const state = getStepState(index);
          const timestamp = timestamps[step.status];

          return (
            <div
              key={step.status}
              className="flex flex-col items-center gap-2 min-w-[80px]"
            >
              {/* Step Badge */}
              <Badge
                variant={
                  state === 'completed' ? 'default' :
                  state === 'current' ? 'default' :
                  state === 'cancelled' ? 'destructive' :
                  'outline'
                }
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 transition-all',
                  state === 'current' && 'animate-pulse ring-2 ring-primary ring-offset-2',
                  state === 'upcoming' && 'opacity-50'
                )}
              >
                {state === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
                <span className="text-xs font-medium whitespace-nowrap">
                  {step.label}
                </span>
              </Badge>

              {/* Timestamp */}
              {timestamp && state === 'completed' && (
                <span className="text-xs text-muted-foreground">
                  {formatTime(timestamp)}
                </span>
              )}

              {/* Description */}
              {state === 'current' && (
                <span className="text-xs text-muted-foreground text-center">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelled Message */}
      {isCancelled && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive text-center">
            Order was cancelled
          </p>
        </div>
      )}
    </div>
  );
}
