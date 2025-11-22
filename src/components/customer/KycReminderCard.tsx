/**
 * KYC Reminder Card Component
 * 
 * Shows a reminder for customers who haven't completed KYC verification
 */

import { useState } from "react";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Button } from "@/components/ui/button";

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
    <CustomerCard className="space-y-4">
      <div className="space-y-3">
        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          ALMOST READY
        </p>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900">
          One last step before your first cash delivery
        </h3>
        
        {/* Body */}
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            Add a bank account so we can verify it's really you,
          </p>
          <p className="text-sm text-slate-600">
            keep the service safe, and enable cash orders.
          </p>
        </div>
        
        {/* Helper text */}
        <p className="text-xs text-slate-500">
          Required before you can place your first order.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <PlaidKycButton
          label="Connect bank"
          onCompleted={onCompleted}
          className="flex-1 h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full bg-black text-white hover:bg-black/90"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-sm text-slate-600 hover:text-slate-900 whitespace-nowrap"
        >
          Remind me later
        </Button>
      </div>
    </CustomerCard>
  );
}

