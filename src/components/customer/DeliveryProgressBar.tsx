/**
 * Delivery Progress Bar Component
 * 
 * Shows a 4-segment progress bar similar to Uber's tracking interface.
 * Each segment represents a stage in the delivery process.
 */

import { cn } from '@/lib/utils';
import type { CustomerFacingStep } from '@/lib/customerStatus';

interface DeliveryProgressBarProps {
  currentStep: CustomerFacingStep;
  className?: string;
}

// Map customer steps to progress segments (0-3, where 0 = no segments filled, 4 = all filled)
// Progress bar has 4 segments, so we map steps to how many segments should be filled (1-4)
const STEP_TO_FILLED_SEGMENTS: Record<CustomerFacingStep, number> = {
  'REQUESTED': 1,      // 1/4 segments filled
  'ASSIGNED': 2,      // 2/4 segments filled
  'PREPARING': 2,     // 2/4 segments filled (same as ASSIGNED)
  'ON_THE_WAY': 3,    // 3/4 segments filled
  'ARRIVED': 4,       // 4/4 segments filled
  'COMPLETED': 4,     // 4/4 segments filled
  'CANCELED': 0,      // 0/4 segments filled
};

export function DeliveryProgressBar({ currentStep, className }: DeliveryProgressBarProps) {
  const filledSegments = STEP_TO_FILLED_SEGMENTS[currentStep] || 0;
  const totalSegments = 4;

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
                ? "bg-emerald-500" 
                : "bg-slate-200"
            )}
          />
        );
      })}
    </div>
  );
}

