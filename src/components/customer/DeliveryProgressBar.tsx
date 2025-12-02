/**
 * Delivery Progress Bar Component
 * 
 * Shows a 5-segment horizontal progress bar (green pills only, no titles).
 * Each segment represents a stage in the delivery process (excluding Completed).
 */

import { cn } from '@/lib/utils';
import type { CustomerFacingStep } from '@/lib/customerStatus';

interface DeliveryProgressBarProps {
  currentStep: CustomerFacingStep;
  className?: string;
}

// Map customer steps to progress segments (0-4, where 0 = no segments filled, 5 = all filled)
// Progress bar has 5 segments (excluding COMPLETED)
const STEP_TO_FILLED_SEGMENTS: Record<CustomerFacingStep, number> = {
  'REQUESTED': 1,      // 1/5 segments filled
  'ASSIGNED': 2,      // 2/5 segments filled
  'PREPARING': 3,     // 3/5 segments filled
  'ON_THE_WAY': 4,    // 4/5 segments filled
  'ARRIVED': 5,       // 5/5 segments filled
  'COMPLETED': 5,     // 5/5 segments filled (all complete, but not a separate step)
  'CANCELED': 0,      // 0/5 segments filled
};

export function DeliveryProgressBar({ currentStep, className }: DeliveryProgressBarProps) {
  const filledSegments = STEP_TO_FILLED_SEGMENTS[currentStep] || 0;
  const totalSegments = 5;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isFilled = index < filledSegments;
        return (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              isFilled 
                ? "bg-[#13F287]" 
                : "bg-slate-200"
            )}
          />
        );
      })}
    </div>
  );
}

