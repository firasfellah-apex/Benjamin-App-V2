/**
 * Bank Accounts Page
 * 
 * User-friendly bank connection management with trust-building elements
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Info, HelpCircle, CheckCircle2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BankingHelpStories } from "@/components/customer/BankingHelpStories";
import { supabase } from "@/db/supabase";
import { toast } from "sonner";
import { clearProfileCache } from "@/hooks/useProfile";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import identityConfirmationIllustration from '@/assets/illustrations/IdentityConfirmation.png';
import easyTransfersIllustration from '@/assets/illustrations/EasyTransfers.png';
import everyoneSafeIllustration from '@/assets/illustrations/EveryoneSafe.png';
import bankingRegulationIllustration from '@/assets/illustrations/BankingRegulation.png';

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
  const { setBottomSlot } = useCustomerBottomSlot();

  // Debug: Log when disconnect dialog state changes
  useEffect(() => {
    console.log('[BankAccounts] showDisconnectDialog:', showDisconnectDialog);
  }, [showDisconnectDialog]);

  // Handler for disconnecting bank
  const handleDisconnectBank = async () => {
    console.log('[Disconnect Bank] Starting disconnect process...');
    setIsDisconnecting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Disconnect Bank] No user found');
        toast.error('Not authenticated');
        return;
      }
      
      console.log('[Disconnect Bank] User ID:', user.id);
      
      // Clear localStorage cache immediately to prevent stale data
      clearProfileCache();
      console.log('[Disconnect Bank] Cleared localStorage cache');
      
      // Update database to remove bank connection
      // Only update columns that actually exist in the profiles table
      console.log('[Disconnect Bank] Updating database...');
      const { error } = await supabase
        .from('profiles')
        .update({
          plaid_item_id: null,
          kyc_status: 'unverified',
          kyc_verified_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('[Disconnect Bank] Database update error:', error);
        throw error;
      }
      
      console.log('[Disconnect Bank] Database updated successfully');
      
      // Invalidate all profile queries and force immediate refetch
      console.log('[Disconnect Bank] Invalidating React Query cache...');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      console.log('[Disconnect Bank] Forcing refetch...');
      await queryClient.refetchQueries({ 
        queryKey: ['profile', user.id],
        type: 'active'
      });
      
      console.log('[Disconnect Bank] Complete! Profile should now show disconnected state');
      toast.success('Bank account disconnected');
      setShowDisconnectDialog(false);
    } catch (error) {
      console.error('[Disconnect Bank] Error:', error);
      toast.error('Failed to disconnect bank account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Invalidate profile cache when component mounts to ensure fresh data
  // This prevents stale bank connection data from being displayed
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
  }, [user?.id, queryClient]);

  const { isLoading } = usePlaidLinkKyc(async () => {
    // After successful KYC, refetch profile
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  });

  // Derived state
  const hasBankConnection = !!profile?.plaid_item_id;

  // Set bottom slot for empty state (Connect bank CTA)
  useEffect(() => {
    if (!hasBankConnection && isReady) {
      setBottomSlot(
        <nav className="fixed bottom-0 left-0 right-0 z-[70] w-screen max-w-none bg-white border-t border-slate-200/70">
          <div className="w-full px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowHelpStories(true)}
              className="w-full h-14"
            >
              Learn How Bank Verification Works
            </Button>
            <PlaidKycButton
              label="Connect Bank with Plaid"
              className="w-full h-14 bg-black text-white hover:bg-black/90"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 text-center">
              Takes about 30 seconds in a secure Plaid window.
            </p>
          </div>
        </nav>
      );
    } else {
      setBottomSlot(null);
    }

    return () => setBottomSlot(null);
  }, [hasBankConnection, isReady, isLoading, setBottomSlot]);

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
    <IconButton
      onClick={() => setShowHelpStories(true)}
      aria-label="Help"
      size="lg"
    >
      <HelpCircle className="h-5 w-5 text-slate-900" strokeWidth={2} />
    </IconButton>
  );

  // Story pages - help screens (Instagram-style)
  const storyPages = [
    {
      id: "page-1",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Why link your bank?</h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Linking your bank proves it's really you. It stops someone else from ordering cash in your name and keeps both you and your runner protected.
          </p>
        </div>
      ),
    },
    {
      id: "page-2",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What Benjamin sees</h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Benjamin never sees your bank login. Plaid encrypts your details and only shares a secure token with us — your passwords and credentials never touch Benjamin.
          </p>
        </div>
      ),
    },
    {
      id: "page-3",
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What happens after you connect</h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Once your bank is verified, you can request cash instantly. We use your linked account to confirm identity and keep fraud low, so orders get approved faster.
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <CustomerScreen
        title="My Bank Accounts"
        subtitle="Link a bank to verify your identity and order cash."
        showBack
        useXButton
        onBack={handleBack}
        fixedContent={fixedContent}
        headerTopRight={helpButton}
        customBottomPadding="220px"
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
                    Link a bank to get started
                  </h3>
                  <p className="text-sm text-slate-600">
                    Benjamin needs at least one verified bank on file before you can request cash.
                  </p>
                </div>
              </CustomerCard>

              {/* Why we ask for your bank - Card grid with illustrations */}
              <div className="grid grid-cols-1 gap-3">
                {/* Card 1: Identity Confirmation */}
                <CustomerCard className="overflow-hidden px-0 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                      <img
                        src={identityConfirmationIllustration}
                        alt="Verify Your Identity"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">Verify Your Identity</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">Keeps your account secure before we deliver cash.</p>
                    </div>
                  </div>
                </CustomerCard>

                {/* Card 2: Instant Transfers */}
                <CustomerCard className="overflow-hidden px-0 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                      <img
                        src={easyTransfersIllustration}
                        alt="Enable Instant Transfers"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">Enable Instant Transfers</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">A verified bank lets money move quickly and safely.</p>
                    </div>
                  </div>
                </CustomerCard>

                {/* Card 3: Keep Everyone Safe */}
                <CustomerCard className="overflow-hidden px-0 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                      <img
                        src={everyoneSafeIllustration}
                        alt="Keep Everyone Safe"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">Keep Everyone Safe</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">Verified customers and runners meet the same security standard.</p>
                    </div>
                  </div>
                </CustomerCard>

                {/* Card 4: Banking Regulation */}
                <CustomerCard className="overflow-hidden px-0 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                      <img
                        src={bankingRegulationIllustration}
                        alt="Banking Regulation"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">Banking Regulation</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">Required by our banking partners for cash-handling compliance.</p>
                    </div>
                  </div>
                </CustomerCard>
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
                    className="w-full h-14 bg-black text-white hover:bg-black/90"
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('[BankAccounts] Disconnect Bank button clicked');
                      setShowDisconnectDialog(true);
                    }}
                    className="w-full h-14"
                  >
                    Disconnect Bank
                  </Button>
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
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900">
              Disconnect Bank Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              You'll need to reconnect a bank account before you can place cash orders. Your order history will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              type="button"
              onClick={handleDisconnectBank}
              disabled={isDisconnecting}
              className="w-full h-14 text-white hover:opacity-90"
              style={{ backgroundColor: '#E84855' }}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Bank'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log('[BankAccounts] Cancel button clicked');
                setShowDisconnectDialog(false);
              }}
              disabled={isDisconnecting}
              className="w-full h-14"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
