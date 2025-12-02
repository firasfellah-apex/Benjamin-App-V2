/**
 * Bank Accounts Page
 * 
 * User-friendly bank connection management with trust-building elements
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Shield, CheckCircle2, Zap, Lock, Info, HelpCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BankingHelpStories } from "@/components/customer/BankingHelpStories";
import { supabase } from "@/db/supabase";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import disconnectBankIllustration from "@/assets/illustrations/Alert.png";

function getKycStatusBadge(kycStatus: string) {
  const status = kycStatus?.toLowerCase();
  if (status === 'verified') {
    return (
      <Badge className="bg-green-500/10 text-green-700 border-green-500/20 flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verified
      </Badge>
    );
  } else if (status === 'pending') {
    return (
      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
        Pending
      </Badge>
    );
  } else if (status === 'failed') {
    return (
      <Badge variant="destructive">
        Failed
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="text-slate-500">
        Unverified
      </Badge>
    );
  }
}

export default function BankAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [showHelpStories, setShowHelpStories] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { isLoading } = usePlaidLinkKyc(async () => {
    // After successful KYC, refetch profile
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  });

  // Get return path from location state (if opened from cash request page)
  // Otherwise default to home
  const returnPath = (location.state as { returnPath?: string })?.returnPath;
  const handleBack = () => {
    if (returnPath) {
      navigate(returnPath);
    } else {
      navigate('/customer/home');
    }
  };

  if (!isReady || !profile) {
    return (
      <CustomerScreen
        title="My Bank Accounts"
        showBack
        useXButton
        onBack={handleBack}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </CustomerScreen>
    );
  }

  const hasBankConnection = !!profile.plaid_item_id;
  const isVerified = profile.kyc_status === 'verified';
  const dailyLimit = profile.daily_limit || 1000;
  const dailyUsage = profile.daily_usage || 0;
  const availableToday = dailyLimit - dailyUsage;

  const institutionName = (profile as any).bank_institution_name || "Primary bank";
  const last4 = (profile as any).bank_last4 || (profile.plaid_item_id ? profile.plaid_item_id.slice(-4) : "••••");
  const institutionLogo = (profile as any).bank_institution_logo_url as string | undefined;

  // Format last synced time (use kyc_verified_at or updated_at)
  const lastSynced = profile.kyc_verified_at 
    ? format(new Date(profile.kyc_verified_at), "h:mm a")
    : profile.updated_at
    ? format(new Date(profile.updated_at), "h:mm a")
    : null;

  // Fixed content: divider under title/subtitle (matches other customer pages)
  const fixedContent = (
    <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
  );

  // Help button for top right (adjacent to X button, like FlowHeader)
  const helpButton = (
    <button
      onClick={() => setShowHelpStories(true)}
      className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-xl bg-[#F7F7F7] hover:bg-[#F7F7F7]/80 active:bg-[#F7F7F7]/60 transition-colors touch-manipulation"
      aria-label="Help"
    >
      <HelpCircle className="h-5 w-5 text-slate-900" strokeWidth={2} />
    </button>
  );

  // Story pages - placeholder content for now
  const storyPages = [
    {
      id: "page-1",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Page 1</h2>
          <p className="text-base text-slate-600">
            Placeholder content for page 1. Add your imagery and copy here.
          </p>
        </div>
      ),
    },
    {
      id: "page-2",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Page 2</h2>
          <p className="text-base text-slate-600">
            Placeholder content for page 2. Add your imagery and copy here.
          </p>
        </div>
      ),
    },
    {
      id: "page-3",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Page 3</h2>
          <p className="text-base text-slate-600">
            Placeholder content for page 3. Add your imagery and copy here.
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <CustomerScreen
        title="My Bank Accounts"
        subtitle="Securely link a bank account to verify your identity and enable cash orders."
        showBack
        useXButton
        onBack={handleBack}
        fixedContent={fixedContent}
        headerTopRight={helpButton}
      topContent={
        <div style={{ paddingTop: '24px' }} className="space-y-6">
          {!hasBankConnection ? (
            <>
              {/* Empty state */}
              <CustomerCard className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <Landmark className="h-8 w-8 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    No bank account connected yet
                  </h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      Benjamin needs at least one verified bank account on file before we can deliver cash.
                    </p>
                    <p>
                      This confirms your identity and helps protect both you and our runners.
                    </p>
                  </div>
                </div>
                <div className="pt-2 space-y-2">
                  <PlaidKycButton
                    label="Connect bank with Plaid"
                    className="w-full h-14 min-h-[56px] px-6 text-[17px] font-semibold rounded-full bg-black text-white hover:bg-black/90"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500">
                    Takes about 30 seconds in a secure Plaid window.
                  </p>
                </div>
              </CustomerCard>

              {/* Why we need this */}
              <CustomerCard className="space-y-4">
                <h4 className="text-base font-semibold text-slate-900">
                  Why Benjamin asks for your bank
                </h4>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>Verify it's really you before sending cash</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Confirm the bank account belongs to you</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <span>Reduce fraud and keep the service safe for everyone</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>Make future cash requests faster to approve</span>
                  </li>
                </ul>
              </CustomerCard>

              {/* Reassurance block */}
              <CustomerCard className="space-y-3 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-slate-900">
                      Your bank login never touches Benjamin
                    </p>
                    <p className="text-xs text-slate-600">
                      Benjamin never sees or stores your online banking password. Bank connection happens in a secure Plaid window, used by thousands of banks and financial apps. Plaid encrypts your credentials and only shares a secure token with us so we can verify your account.
                    </p>
                    <p className="text-xs text-slate-500 pt-1">
                      You can browse the app without linking a bank, but you won't be able to request cash until at least one account is connected.
                    </p>
                  </div>
                </div>
              </CustomerCard>

              {/* Troubleshooting Link */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Add help/troubleshooting modal or page
                    console.log("Show bank verification help");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  Having issues? Learn how bank verification works
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Primary Bank Card */}
              <CustomerCard className="space-y-4 px-0">
                {/* Header: Bank logo, name, account, purpose */}
                <div className="flex items-start gap-3">
                  {institutionLogo ? (
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={institutionLogo}
                        alt={institutionName}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Landmark className="h-6 w-6 text-green-600" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {institutionName}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Bank account •••• {last4}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Used to verify your identity and approve cash requests.
                        </p>
                      </div>
                      {getKycStatusBadge(profile.kyc_status)}
                    </div>
                  </div>
                </div>

                {/* Key info: Daily limit, Available today, Last verified */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Daily limit</span>
                    <span className="text-sm font-semibold text-slate-900">
                      ${dailyLimit.toLocaleString()}/day
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Available today</span>
                    <span className="text-base font-semibold text-green-600">
                      ${availableToday.toLocaleString()}
                    </span>
                  </div>
                  {lastSynced && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Last verified</span>
                      <span className="text-sm text-slate-500">
                        Today, {lastSynced}
                      </span>
                    </div>
                  )}
                  {hasBankConnection && !isVerified && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                      We still need a quick refresh of your bank connection to complete verification.
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <PlaidKycButton
                    label={isVerified ? "Change Bank" : "Finish verification"}
                    className="w-full rounded-xl bg-black text-white hover:bg-black/90 font-semibold h-14 min-h-[56px] px-6 text-[17px]"
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowDisconnectDialog(true)}
                    className="w-full h-14 rounded-xl text-[15px] font-medium"
                  >
                    Disconnect Bank
                  </Button>
                </div>
              </CustomerCard>

              {/* Security Card */}
              <CustomerCard className="space-y-3 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      Your credentials never touch Benjamin
                    </p>
                    <p className="text-xs text-slate-600">
                      Plaid handles all verification securely. Your bank login credentials are never stored on Benjamin’s servers.
                    </p>
                  </div>
                </div>
              </CustomerCard>

              {/* Troubleshooting Link */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Add help/troubleshooting modal or page
                    console.log("Show bank verification help");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  Having issues? Learn how bank verification works
                </Button>
              </div>
            </>
          )}
        </div>
      }
    />
      <BankingHelpStories
        isOpen={showHelpStories}
        onClose={() => setShowHelpStories(false)}
        pages={storyPages}
      />

      {/* Disconnect Bank Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            {/* Illustration */}
            <div className="w-full h-48 md:h-56 flex items-center justify-center bg-[#F8D8D2] rounded-2xl">
              <img
                src={disconnectBankIllustration}
                alt="Disconnect bank"
                className="w-3/4 h-3/4 object-contain"
              />
            </div>
            
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-semibold text-slate-900">
                Disconnect Bank Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-600">
                You'll need to reconnect a bank account before you can place cash orders. Your order history will remain intact.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              variant="destructive"
              onClick={async () => {
                setIsDisconnecting(true);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      plaid_item_id: null,
                      plaid_access_token: null,
                      kyc_status: 'unverified',
                      bank_institution_name: null,
                      bank_last4: null,
                      bank_institution_logo_url: null,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                  
                  if (error) throw error;
                  
                  // Invalidate profile cache to refetch
                  await queryClient.invalidateQueries({ queryKey: ['profile'] });
                  
                  toast.success('Bank account disconnected');
                  setShowDisconnectDialog(false);
                } catch (error) {
                  console.error('Error disconnecting bank:', error);
                  toast.error('Failed to disconnect bank account');
                } finally {
                  setIsDisconnecting(false);
                }
              }}
              disabled={isDisconnecting}
              className="w-full h-14 rounded-xl"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Bank'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
              className="w-full h-14 rounded-xl"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
