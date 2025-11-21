/**
 * Connect Bank Onboarding Page
 * 
 * Shown immediately after profile completion to encourage bank connection
 */

import { useNavigate } from "react-router-dom";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { FlowHeader } from "@/components/customer/FlowHeader";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Button } from "@/components/ui/button";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import { useQueryClient } from "@tanstack/react-query";

export default function ConnectBankOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isLoading } = usePlaidLinkKyc(async () => {
    // After successful KYC, refetch profile and navigate to home
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    navigate('/customer/home', { replace: true });
  });

  const handleSkip = () => {
    navigate('/customer/home', { replace: true });
  };

  const handleBack = () => {
    navigate('/customer/onboarding/profile');
  };

  return (
    <CustomerScreen
      flowHeader={
        <FlowHeader
          step={2}
          totalSteps={2}
          mode="back"
          onPrimaryNavClick={handleBack}
          title="Connect your bank"
          subtitle="Link your bank account securely with Plaid"
        />
      }
      topContent={
        <div style={{ paddingTop: '24px' }}>
          <CustomerCard className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Connect your bank for faster cash requests
                </h2>
                <p className="text-sm text-slate-600">
                  Link your bank account securely with Plaid so we can verify your identity and send cash to you faster.
                </p>
              </div>

              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>One-time, secure connection via Plaid</span>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>Benjamin never sees your bank password</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>Required before we can deliver your first cash order</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <PlaidKycButton
                label="Connect bank with Plaid"
                className="w-full"
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-slate-600"
              >
                Skip for now
              </Button>
            </div>
          </CustomerCard>
        </div>
      }
    />
  );
}

