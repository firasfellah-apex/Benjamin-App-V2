/**
 * Order Timeline Component
 * 
 * Shows order progress through status steps
 * - Horizontal chips with animations
 * - Current step pulses
 * - Completed steps show checkmark and timestamp
 * - Supports both internal (admin/runner) and customer views
 */

import { OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { Check, Clock, Package, MapPin, Banknote, HandCoins, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { strings } from '@/lib/strings';
import { 
  getCustomerFacingStatus, 
  CUSTOMER_TIMELINE_STEPS, 
  CustomerFacingStep 
} from '@/lib/customerStatus';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status: 'Pending',
    label: strings.status.pending,
    icon: <Clock className="h-4 w-4" />,
    description: strings.customer.waitingForRunner
  },
  {
    status: 'Runner Accepted',
    label: strings.status.accepted,
    icon: <Package className="h-4 w-4" />,
    description: strings.customer.runnerAccepted
  },
  {
    status: 'Runner at ATM',
    label: strings.status.runnerAtATM,
    icon: <MapPin className="h-4 w-4" />,
    description: strings.customer.runnerAtATM
  },
  {
    status: 'Cash Withdrawn',
    label: strings.status.cashPicked,
    icon: <Banknote className="h-4 w-4" />,
    description: strings.customer.cashWithdrawn
  },
  {
    status: 'Pending Handoff',
    label: strings.status.enRoute,
    icon: <HandCoins className="h-4 w-4" />,
    description: strings.status.enRoute
  },
  {
    status: 'Completed',
    label: strings.status.delivered,
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: strings.customer.deliveryComplete
  }
];

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timestamps?: Partial<Record<OrderStatus, string>>;
  className?: string;
  variant?: 'internal' | 'customer';
}

export function OrderTimeline({
  currentStatus,
  timestamps = {},
  className,
  variant = 'internal'
}: OrderTimelineProps) {
  const isCancelled = currentStatus === 'Cancelled';

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Customer variant: simplified grouped journey
  if (variant === 'customer') {
    const { step: currentStep } = getCustomerFacingStatus(currentStatus);
    const steps = CUSTOMER_TIMELINE_STEPS;
    const currentIndex = steps.findIndex(s => s.step === currentStep);

    const getStepState = (index: number): 'completed' | 'current' | 'upcoming' | 'cancelled' => {
      if (isCancelled) return 'cancelled';
      if (index < currentIndex) return 'completed';
      if (index === currentIndex) return 'current';
      return 'upcoming';
    };

    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const state = getStepState(index);

            return (
              <div
                key={step.step}
                className="flex flex-col items-center gap-2 min-w-[80px]"
              >
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
                  ) : state === 'current' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium whitespace-nowrap">
                    {step.label}
                  </span>
                </Badge>

                {state === 'current' && (
                  <span className="text-xs text-muted-foreground text-center">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {isCancelled && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive text-center">
              {strings.customer.orderCancelled}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Internal variant: detailed granular view for admin/runner
  const currentIndex = TIMELINE_STEPS.findIndex(step => step.status === currentStatus);

  const getStepState = (index: number): 'completed' | 'current' | 'upcoming' | 'cancelled' => {
    if (isCancelled) return 'cancelled';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {TIMELINE_STEPS.map((step, index) => {
          const state = getStepState(index);
          const timestamp = timestamps[step.status];

          return (
            <div
              key={step.status}
              className="flex flex-col items-center gap-2 min-w-[80px]"
            >
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

              {timestamp && state === 'completed' && (
                <span className="text-xs text-muted-foreground">
                  {formatTime(timestamp)}
                </span>
              )}

              {state === 'current' && (
                <span className="text-xs text-muted-foreground text-center">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive text-center">
            {strings.customer.orderCancelled}
          </p>
        </div>
      )}
    </div>
  );
}
