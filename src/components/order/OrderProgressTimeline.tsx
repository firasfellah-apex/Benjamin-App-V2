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
  tone?: 'customer' | 'runner';
};

export function OrderProgressTimeline({ 
  currentStatus, 
  variant,
  tone = 'customer'
}: OrderProgressTimelineProps) {
  let steps: TimelineStep[] = [];
  let currentIndex = -1;
  const isCanceled = currentStatus === 'Cancelled';
  const isRunner = tone === 'runner';

  if (variant === 'customer') {
    const { step: currentStep } = getCustomerFacingStatus(currentStatus);
    steps = CUSTOMER_TIMELINE_STEPS.map(s => ({
      id: s.step,
      label: s.label,
      description: s.description
    }));
    
    if (!isCanceled) {
      currentIndex = steps.findIndex(s => s.id === currentStep);
      // Safety fallback: if step not found, default to 0
      if (currentIndex === -1) {
        currentIndex = currentStep === 'COMPLETED' ? steps.length - 1 : 0;
      }
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
    <div className={cn(
      "rounded-2xl border shadow-sm p-6",
      isRunner 
        ? "bg-[#0B1020] border-[rgba(148,163,253,0.14)]"
        : "bg-white border-black/5"
    )}>
      <div className="relative">
        {/* Vertical line */}
        <div className={cn(
          "absolute left-[11px] top-2 bottom-2 w-px",
          isRunner ? "bg-slate-700" : "bg-neutral-200"
        )} />
        
        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            // Check if order is completed (last step in customer timeline is COMPLETED)
            const isOrderCompleted = currentStatus === 'Completed';
            // When status is Completed, all steps should be marked as completed
            // For completed orders, mark all steps as completed
            const isCompleted = isOrderCompleted ? true : index <= currentIndex;
            // Only show "current" state if it's the current step AND order is not completed
            // When order is completed, we want all steps to show as completed (not current)
            const isCurrent = !isCanceled && !isOrderCompleted && index === currentIndex && currentIndex < steps.length - 1;
            const isFuture = !isOrderCompleted && index > currentIndex;
            // For completed orders, all steps should show as completed (not current)
            const showAsCompleted = isCompleted && !isCurrent;

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Node */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full transition-all duration-200',
                      isRunner ? (
                        showAsCompleted && 'w-6 h-6 bg-[#6366F1]' ||
                        isCurrent && 'w-7 h-7 bg-[#6366F1] ring-4 ring-[#6366F1]/20' ||
                        isFuture && 'w-6 h-6 border-2 border-slate-700 bg-[#0B1020]'
                      ) : (
                        showAsCompleted && 'w-6 h-6 bg-black' ||
                        isCurrent && 'w-7 h-7 bg-black ring-4 ring-black/10' ||
                        isFuture && 'w-6 h-6 border-2 border-neutral-300 bg-white'
                      )
                    )}
                  >
                    {showAsCompleted && (
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
                    isCurrent && (
                      isRunner 
                        ? 'bg-[#6366F1]/10 -ml-2 -mt-1 pl-6 pr-4 py-3 rounded-xl shadow-sm scale-[1.02]'
                        : 'bg-neutral-50 -ml-2 -mt-1 pl-6 pr-4 py-3 rounded-xl shadow-sm scale-[1.02]'
                    )
                  )}
                >
                  <div
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      isRunner ? (
                        (showAsCompleted || isCurrent) && 'text-white' ||
                        isFuture && 'text-slate-500'
                      ) : (
                        (showAsCompleted || isCurrent) && 'text-black' ||
                        isFuture && 'text-neutral-400'
                      )
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div
                      className={cn(
                        'text-xs mt-1 transition-colors',
                        isRunner ? (
                          (showAsCompleted || isCurrent) && 'text-slate-300' ||
                          isFuture && 'text-slate-600'
                        ) : (
                          (showAsCompleted || isCurrent) && 'text-muted-foreground' ||
                          isFuture && 'text-neutral-300'
                        )
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
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full",
                  isRunner ? "bg-slate-700" : "bg-neutral-400"
                )}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className={cn(
                  "text-sm font-semibold",
                  isRunner ? "text-slate-400" : "text-neutral-600"
                )}>
                  Canceled
                </div>
                <div className={cn(
                  "text-xs mt-1",
                  isRunner ? "text-slate-600" : "text-neutral-400"
                )}>
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
