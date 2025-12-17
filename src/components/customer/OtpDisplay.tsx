/**
 * Reusable PIN Display Component
 * 
 * Shows verification PIN in a consistent format across the app.
 * Used in ActiveDeliverySheet (collapsed/expanded) and RequestFlowBottomBar (home nav).
 */

import { cn } from '@/lib/utils';
import type { CustomerFacingStep } from '@/lib/customerStatus';

interface OtpDisplayProps {
  otpCode: string;
  customerStatusStep?: CustomerFacingStep;
  className?: string;
}

export function OtpDisplay({ otpCode, customerStatusStep, className }: OtpDisplayProps) {
  const sublabelText = customerStatusStep === 'ARRIVED' 
    ? 'Share this PIN with your runner to receive your cash'
    : 'Share this PIN only with your Benjamin runner when they arrive';

  return (
    <div className={cn("p-3 bg-green-50 border border-green-200 rounded-xl", className)}>
      <p className="text-xs font-medium text-green-900">Verification PIN</p>
      <p className="text-[10px] text-green-700 mt-0.5">
        {sublabelText}
      </p>
      <div className="flex justify-center gap-1.5 mt-3">
        {otpCode.split('').map((digit, idx) => (
          <div
            key={idx}
            className="w-8 h-10 flex items-center justify-center bg-white border-2 border-green-300 rounded-lg text-lg font-bold text-green-900"
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}

