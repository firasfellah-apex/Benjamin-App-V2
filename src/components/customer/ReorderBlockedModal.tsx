import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReorderEligibilityResult } from '@/features/orders/reorderEligibility';

interface ReorderBlockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibilityResult: ReorderEligibilityResult;
  onStartNewRequest: () => void;
}

export function ReorderBlockedModal({
  open,
  onOpenChange,
  eligibilityResult,
  onStartNewRequest,
}: ReorderBlockedModalProps) {
  const handleStartNewRequest = () => {
    onOpenChange(false);
    onStartNewRequest();
  };

  if (!eligibilityResult.reason) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            We need a quick update first
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed pt-2">
            {eligibilityResult.message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button
            type="button"
            onClick={handleStartNewRequest}
            className="w-full h-14 text-base font-semibold"
          >
            Start a new request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

