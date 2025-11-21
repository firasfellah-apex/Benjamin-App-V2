/**
 * KYC Reminder Card Component
 * 
 * Shows a reminder for customers who haven't completed KYC verification
 */

import { useState } from "react";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

const DISMISS_KEY = "benjamin_bank_prompt_dismissed";

interface KycReminderCardProps {
  onCompleted?: () => void;
}

export function KycReminderCard({ onCompleted }: KycReminderCardProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DISMISS_KEY) === "true";
    }
    return false;
  });

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "true");
      setIsDismissed(true);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <CustomerCard className="space-y-4 bg-blue-50/50 border border-blue-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              One step left before your first cash delivery
            </h3>
            <p className="text-sm text-slate-600">
              Connect your bank so we can verify your identity and send cash securely.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
        <PlaidKycButton
          label="Connect bank"
          size="sm"
          onCompleted={onCompleted}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs text-slate-500"
        >
          Remind me later
        </Button>
      </div>
    </CustomerCard>
  );
}

