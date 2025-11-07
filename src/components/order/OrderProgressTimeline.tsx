import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/types';
import { getCustomerFacingStatus, CUSTOMER_TIMELINE_STEPS, type CustomerFacingStep } from '@/lib/customerStatus';

type TimelineStep = {
  id: string;
  label: string;
  description?: string;
};

type OrderProgressTimelineProps = {
  currentStatus: OrderStatus;
  variant: 'customer' | 'internal';
};

export function OrderProgressTimeline({ currentStatus, variant }: OrderProgressTimelineProps) {
  let steps: TimelineStep[] = [];
  let currentIndex = -1;
  const isCanceled = currentStatus === 'Cancelled';

  if (variant === 'customer') {
    const { step: currentStep } = getCustomerFacingStatus(currentStatus);
    steps = CUSTOMER_TIMELINE_STEPS.map(s => ({
      id: s.step,
      label: s.label,
      description: s.description
    }));
    
    if (!isCanceled) {
      currentIndex = steps.findIndex(s => s.id === currentStep);
    }
  } else {
    // Internal chain-of-custody steps
    steps = [
      { id: 'Pending', label: 'Pending', description: 'Awaiting runner acceptance' },
      { id: 'Runner Accepted', label: 'Runner accepted', description: 'Runner committed to delivery' },
      { id: 'Runner at ATM', label: 'Runner at ATM', description: 'Preparing cash withdrawal' },
      { id: 'Cash Withdrawn', label: 'Cash withdrawn', description: 'Cash secured, en route' },
      { id: 'Pending Handoff', label: 'Pending handoff', description: 'Awaiting customer meetup' },
      { id: 'Completed', label: 'Completed', description: 'Delivery confirmed' }
    ];
    
    if (!isCanceled) {
      currentIndex = steps.findIndex(s => s.id === currentStatus);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-200" />
        
        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Node */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full transition-all duration-200',
                      isCompleted && 'w-6 h-6 bg-black',
                      isCurrent && 'w-7 h-7 bg-black ring-4 ring-black/10',
                      isFuture && 'w-6 h-6 border-2 border-neutral-300 bg-white'
                    )}
                  >
                    {isCompleted && (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div
                  className={cn(
                    'flex-1 pb-2 transition-all duration-200',
                    isCurrent && 'bg-neutral-50 -ml-2 -mt-1 pl-6 pr-4 py-3 rounded-xl shadow-sm scale-[1.02]'
                  )}
                >
                  <div
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      (isCompleted || isCurrent) && 'text-black',
                      isFuture && 'text-neutral-400'
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div
                      className={cn(
                        'text-xs mt-1 transition-colors',
                        (isCompleted || isCurrent) && 'text-muted-foreground',
                        isFuture && 'text-neutral-300'
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Canceled state */}
          {isCanceled && (
            <div className="relative flex items-start gap-4">
              <div className="relative z-10 flex-shrink-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-400">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className="text-sm font-semibold text-neutral-600">
                  Canceled
                </div>
                <div className="text-xs mt-1 text-neutral-400">
                  This request has been canceled
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
