import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import connectBankIllustration from '@/assets/illustrations/ConnectBank.png';

interface VerifyBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerifyBankModal({
  open,
  onOpenChange,
}: VerifyBankModalProps) {
  const navigate = useNavigate();

  const handleVerifyBank = () => {
    onOpenChange(false);
    navigate('/customer/banks');
  };

  const handleNotNow = () => {
    onOpenChange(false);
  };

  if (!open) return null;

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-[24px] bg-white shadow-xl relative overflow-hidden">
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <IconButton
            type="button"
            variant="default"
            size="lg"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-900" />
          </IconButton>
        </div>

        {/* Illustration frame - 6px from top and sides */}
        <div className="w-full px-[6px] pt-[6px]">
          <div
            className="w-full h-[260px] flex items-center justify-center rounded-[18px]"
          >
            <div className="w-[193px] h-[193px] flex items-center justify-center overflow-hidden rounded-[18px]">
              <img
                src={connectBankIllustration}
                alt="Connect bank"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content - with 24px padding on sides and bottom */}
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-slate-900">
              Just One Quick Check
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed pt-2">
              Before we can deliver cash, we need to confirm your identity & bank. This keeps your money (and our runners) safe.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
          <Button
            type="button"
            onClick={handleVerifyBank}
            className="w-full h-14 text-base font-semibold"
          >
            Verify My Bank
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleNotNow}
            className="w-full h-14 text-base font-semibold"
          >
            Not Now
          </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

