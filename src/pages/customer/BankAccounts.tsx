/**
 * Bank Accounts Page
 * 
 * User-friendly bank connection management with trust-building elements
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import CustomerCard from "@/pages/customer/components/CustomerCard";
import { PlaidKycButton } from "@/components/customer/plaid/PlaidKycButton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Landmark, HelpCircle, MoreVertical, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Switch } from "@/components/ui/switch";
import { setPrimaryBankAccount } from "@/db/api";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaidLinkKyc } from "@/hooks/usePlaidLinkKyc";
import { useQueryClient } from "@tanstack/react-query";
import { BankingHelpStories } from "@/components/customer/BankingHelpStories";
import { supabase } from "@/db/supabase";
import { toast } from "sonner";
import { clearProfileCache } from "@/hooks/useProfile";
import { useBankAccounts, useInvalidateBankAccounts, disconnectBankAccount } from "@/hooks/useBankAccounts";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { useOrderDraftStore } from "@/stores/useOrderDraftStore";
import identityConfirmationIllustration from '@/assets/illustrations/IdentityConfirmation.png';
import easyTransfersIllustration from '@/assets/illustrations/EasyTransfers.png';
import everyoneSafeIllustration from '@/assets/illustrations/EveryoneSafe.png';
import bankingRegulationIllustration from '@/assets/illustrations/BankingRegulation.png';


export default function BankAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const { bankAccounts, hasAnyBank, isLoading: isLoadingBanks } = useBankAccounts();
  const invalidateBankAccounts = useInvalidateBankAccounts();
  const queryClient = useQueryClient();
  const [showHelpStories, setShowHelpStories] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [bankAccountToDisconnect, setBankAccountToDisconnect] = useState<{ id: string; institutionName: string; last4: string; logoUrl: string | null } | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);
  const { setBottomSlot } = useCustomerBottomSlot();
  
  // Ref to track help button position - MUST be before any conditional returns
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [helpButtonPosition, setHelpButtonPosition] = useState<{ top: number; right: number } | null>(null);

  // Debug: Log bank accounts state
  useEffect(() => {
    console.log('[BankAccounts] Bank accounts state:', {
      bankAccountsCount: bankAccounts.length,
      hasAnyBank,
      isLoadingBanks,
      bankAccounts: bankAccounts.map(ba => ({
        id: ba.id,
        institution_name: ba.bank_institution_name,
        plaid_item_id: ba.plaid_item_id,
      })),
      profile_plaid_item_id: profile?.plaid_item_id,
    });
  }, [bankAccounts, hasAnyBank, isLoadingBanks, profile?.plaid_item_id]);


  // Auto-refresh profile if bank is connected but institution data is missing
  useEffect(() => {
    if (profile && profile.plaid_item_id && !profile.bank_institution_name && isReady) {
      console.log('[BankAccounts] Bank connected but institution data missing, refreshing profile...');
      // Wait a bit for Edge Function to finish, then refresh
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.refetchQueries({ queryKey: ['profile'], type: 'active' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [profile, isReady, queryClient]);

  // Handler for showing disconnect confirmation dialog
  const handleDisconnectBank = (bankAccountId: string) => {
    const bankAccount = bankAccounts.find(ba => ba.id === bankAccountId);
    if (bankAccount) {
      const last4 = bankAccount.bank_last4 || (bankAccount.plaid_item_id ? bankAccount.plaid_item_id.slice(-4) : "****");
      setBankAccountToDisconnect({
        id: bankAccount.id,
        institutionName: bankAccount.bank_institution_name || 'Bank Account',
        last4: last4,
        logoUrl: bankAccount.bank_institution_logo_url
      });
      setShowDisconnectDialog(true);
      setExpandedBankId(null); // Close the menu
    }
  };

  // Handler for setting primary bank account
  const handleSetPrimary = async (bankAccountId: string, checked: boolean) => {
    // If unchecking and this is the only account, don't allow
    if (!checked) {
      const primaryCount = bankAccounts.filter(ba => ba.is_primary).length;
      if (primaryCount === 1 && bankAccounts.find(ba => ba.id === bankAccountId)?.is_primary) {
        toast.error('You must have at least one primary account. Set another account as primary first.');
        return;
      }
    }

    setIsSettingPrimary(bankAccountId);
    
    try {
      const success = await setPrimaryBankAccount(bankAccountId);
      
      if (success) {
        // Invalidate bank accounts cache to refresh the list
        await invalidateBankAccounts();
        toast.success('Primary bank account updated');
      } else {
        throw new Error('Failed to set primary bank account');
      }
    } catch (error) {
      console.error('[Set Primary Bank] Error:', error);
      toast.error('Failed to set primary bank account');
    } finally {
      setIsSettingPrimary(null);
    }
  };

  // Handler for confirming bank account disconnection
  const confirmDisconnect = async () => {
    if (!bankAccountToDisconnect) return;
    
    // Check if this is the only primary account
    const isOnlyPrimary = bankAccounts.length > 0 && 
      bankAccounts.filter(ba => ba.is_primary).length === 1 &&
      bankAccountToDisconnect.id === bankAccounts.find(ba => ba.is_primary)?.id;
    
    if (isOnlyPrimary) {
      toast.error('Cannot disconnect your only primary bank account. Set another account as primary first.');
      setShowDisconnectDialog(false);
      setBankAccountToDisconnect(null);
      return;
    }
    
    console.log('[Disconnect Bank] Starting disconnect process for:', bankAccountToDisconnect.id);
    setIsDisconnecting(true);
    
    try {
      const success = await disconnectBankAccount(bankAccountToDisconnect.id);
      
      if (success) {
        // Invalidate bank accounts cache
        invalidateBankAccounts();
        
        // If this was the last bank account, also update profile KYC status
        if (bankAccounts.length === 1) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({
                kyc_status: 'unverified',
                kyc_verified_at: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            clearProfileCache();
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
          }
        }
        
        toast.success('Bank account disconnected');
        setShowDisconnectDialog(false);
        setBankAccountToDisconnect(null);
      } else {
        throw new Error('Failed to disconnect bank account');
      }
    } catch (error) {
      console.error('[Disconnect Bank] Error:', error);
      toast.error('Failed to disconnect bank account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Toggle bank account menu
  const toggleBankMenu = (bankAccountId: string) => {
    setExpandedBankId(expandedBankId === bankAccountId ? null : bankAccountId);
  };

  // Invalidate profile cache when component mounts to ensure fresh data
  // This prevents stale bank connection data from being displayed
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
  }, [user?.id, queryClient]);

  // Derived state - use bank accounts instead of profile
  const hasBankConnection = hasAnyBank;

  // Get return path from location state (if opened from cash request page)
  // Otherwise default to home
  const returnPath = (location.state as { returnPath?: string })?.returnPath;
  
  // Check if we came from an order flow (via returnPath or order draft store)
  const { returnTo, clearDraft } = useOrderDraftStore();
  const cameFromOrderFlow = !!returnPath || returnTo === 'order-review';
  
  // Clear order draft store if we didn't come from an order flow
  // This prevents navigation after bank connection when user accessed page voluntarily
  useEffect(() => {
    if (!cameFromOrderFlow && returnTo === 'order-review') {
      console.log('[BankAccounts] Clearing order draft store - user accessed page voluntarily');
      clearDraft();
    }
  }, [cameFromOrderFlow, returnTo, clearDraft]);
  
  const { isLoading } = usePlaidLinkKyc(async () => {
    // After successful KYC, refetch profile and bank accounts
    console.log('[BankAccounts] Plaid success - invalidating caches...');
    
    // Wait a bit for Edge Function to finish updating the database
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Invalidate and refetch profile first
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    await queryClient.refetchQueries({ queryKey: ['profile'] });
    
    // Wait a bit more for profile to be updated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Then invalidate and refetch bank accounts (this will trigger a fresh fetch)
    await invalidateBankAccounts();
    
    // Force a refetch one more time after a short delay to ensure we get the latest data
    await new Promise(resolve => setTimeout(resolve, 500));
    await queryClient.refetchQueries({ queryKey: ["bank-accounts", user?.id] });
    
    console.log('[BankAccounts] Caches invalidated and refetched');
    
    // Navigation is handled by usePlaidLinkKyc hook based on returnTo
    // If we cleared the draft, it won't navigate
  });
  const handleBack = () => {
    if (returnPath) {
      navigate(returnPath);
    } else {
      navigate('/customer/home');
    }
  };

  // Set bottom slot: Show "Add Bank Account" when bank is connected, "Connect Bank" when empty
  useEffect(() => {
    if (!isReady) return;

    if (hasBankConnection) {
      // Show "Add Bank Account" button when bank is connected
      setBottomSlot(
        <nav className="fixed bottom-0 left-0 right-0 z-[70] w-screen max-w-none bg-white border-t border-slate-200/70">
          <div className="w-full px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
            <PlaidKycButton
              label="Add Bank Account"
              className="w-full h-14 bg-black text-white hover:bg-black/90"
              disabled={isLoading}
            />
          </div>
        </nav>
      );
    } else {
      // Empty state: show "Connect Bank with Plaid" button
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
    }

    return () => setBottomSlot(null);
  }, [hasBankConnection, isReady, isLoading, setBottomSlot]);

  // Debug: Log institution data with full details
  useEffect(() => {
    if (profile) {
      console.log('[BankAccounts] Profile institution data:', {
        bank_institution_name: profile.bank_institution_name,
        bank_institution_name_type: typeof profile.bank_institution_name,
        bank_institution_logo_url: profile.bank_institution_logo_url,
        bank_institution_logo_url_type: typeof profile.bank_institution_logo_url,
        bank_institution_logo_url_preview: profile.bank_institution_logo_url 
          ? profile.bank_institution_logo_url.substring(0, 50) + '...' 
          : 'null',
        plaid_item_id: profile.plaid_item_id,
        profile_keys: Object.keys(profile).filter(k => k.includes('bank') || k.includes('institution')),
      });
    }
  }, [profile]);

  // Early return AFTER all hooks have been called
  if (!isReady || !profile || isLoadingBanks) {
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

  const dailyLimit = profile.daily_limit || 1000;
  const dailyUsage = profile.daily_usage || 0;
  const availableToday = dailyLimit - dailyUsage;
  const progressPercentage = (availableToday / dailyLimit) * 100;
  
  // Calculate stroke-dashoffset for circular progress
  // Larger radius to prevent text from overlaying progress bar
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // These variables are only used in the empty state section now
  // The bank accounts list uses data from bankAccounts array

  // Fixed content: divider under title/subtitle (matches other customer pages)
  const fixedContent = (
    <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
  );

  // Help button for top right (adjacent to X button, like FlowHeader)
  const helpButton = (
    <IconButton
      ref={helpButtonRef}
      onClick={() => {
        // Get button position before opening modal
        if (helpButtonRef.current) {
          const rect = helpButtonRef.current.getBoundingClientRect();
          setHelpButtonPosition({
            top: rect.top,
            right: window.innerWidth - rect.right,
          });
        }
        setShowHelpStories(true);
      }}
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
          {/* Circular Progress Indicator - Always show when banks are connected */}
          {hasBankConnection && (
            <div className="flex flex-col items-center justify-center">
              {/* Circular Progress - Larger diameter with thicker stroke */}
              <div className="relative w-64 h-64">
                <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress circle - Brand green #13F287 with thicker stroke */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="#13F287"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                {/* Center content - All text inside circle with more breathing space */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
                  <div className="text-xl font-bold text-slate-900 leading-tight text-center">
                    ${availableToday.toLocaleString()}/${dailyLimit.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-sm text-slate-600">Available Today</span>
                    <InfoTooltip
                      label="Available Today"
                      side="top"
                      align="center"
                    >
                      Available Today is your remaining daily limit. We cap daily cash deliveries to keep the service safe and reliable for everyone.
                    </InfoTooltip>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!hasBankConnection ? (
            <>
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
              {/* Display all bank accounts - Each as individual component */}
              {bankAccounts.length > 0 ? (
                <div className="space-y-3">
                  {bankAccounts.map((bankAccount) => {
                    const institutionName = bankAccount.bank_institution_name || "Primary bank";
                    const last4 = bankAccount.bank_last4 || (bankAccount.plaid_item_id ? bankAccount.plaid_item_id.slice(-4) : "3459");
                    const institutionLogo = bankAccount.bank_institution_logo_url;
                    const isExpanded = expandedBankId === bankAccount.id;

                    const isPrimary = bankAccount.is_primary;
                    const isOnlyPrimary = bankAccounts.filter(ba => ba.is_primary).length === 1 && isPrimary;
                    const isSettingThisPrimary = isSettingPrimary === bankAccount.id;

                    return (
                      <div key={bankAccount.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/40 overflow-hidden">
                        {/* Bank Account Card - 12px padding all around */}
                        <div className="p-3">
                          <div className="flex items-center gap-3">
                            {/* Bank Logo - 48x48px with 12px roundness (square, not circular) */}
                            {institutionLogo ? (
                              <div
                                className="h-12 w-12 flex-shrink-0 bg-white rounded-[12px] overflow-hidden flex items-center justify-center"
                              >
                                <img
                                  src={institutionLogo}
                                  alt={institutionName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Landmark className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                            
                            {/* Bank Name and Account Number */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-slate-900 truncate">
                                  {institutionName}
                                </h3>
                                {isPrimary && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">
                                **** {last4}
                              </p>
                            </div>
                            
                            {/* Menu button - 48x48px with 12px roundness */}
                            <button
                              onClick={() => toggleBankMenu(bankAccount.id)}
                              aria-label={isExpanded ? "Close menu" : "More options"}
                              className="w-12 h-12 rounded-xl bg-[#F7F7F7] flex items-center justify-center hover:bg-[#EDEDED] active:bg-[#E0E0E0] transition-colors"
                            >
                              {isExpanded ? (
                                <X className="h-5 w-5 text-slate-900" />
                              ) : (
                                <MoreVertical className="h-5 w-5 text-slate-900" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Expanded Menu - Shows when kebab is clicked */}
                        <div
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: isExpanded ? '200px' : '0',
                            opacity: isExpanded ? 1 : 0,
                          }}
                        >
                          <div className="px-3 pt-2 pb-3 space-y-3">
                            {/* Make Primary Toggle - Only visible in expanded menu */}
                            {!isPrimary && (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">Make Primary</span>
                              <InfoTooltip
                                label="Primary Bank Account"
                                side="top"
                                align="start"
                              >
                                    <div className="space-y-2">
                                      <p className="text-sm text-slate-300">
                                        This is your default bank for identity verification and account-level refunds.
                                      </p>
                                      <p className="text-sm text-slate-300">
                                        For individual orders, refunds always go back to the bank used for that order.
                                      </p>
                                    </div>
                              </InfoTooltip>
                                </div>
                                <Switch
                                  checked={false}
                                  onCheckedChange={(checked) => handleSetPrimary(bankAccount.id, checked)}
                                  disabled={isSettingThisPrimary}
                                  className="data-[state=checked]:bg-[#13F287] data-[state=checked]:border-[#13F287]"
                                />
                              </div>
                            )}

                            {/* Disconnect Button */}
                            <Button
                              onClick={() => handleDisconnectBank(bankAccount.id)}
                              disabled={isDisconnecting || isOnlyPrimary}
                              className="w-full h-14 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#E84855' }}
                            >
                              {isDisconnecting 
                                ? 'Disconnecting...' 
                                : isOnlyPrimary 
                                  ? 'Cannot disconnect primary account'
                                  : 'Disconnect Bank Account'
                              }
                            </Button>
                            {isOnlyPrimary && (
                              <p className="text-xs text-slate-500 text-center">
                                Set another account as primary first
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No bank accounts found. Please connect a bank account.
                </div>
              )}
            </>
          )}
        </div>
      }
    />
      <BankingHelpStories
        isOpen={showHelpStories}
        onClose={() => setShowHelpStories(false)}
        pages={storyPages}
        closeButtonPosition={helpButtonPosition}
      />

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent 
          className="p-0 gap-0 !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !right-auto !bottom-auto"
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            right: 'auto',
            bottom: 'auto'
          }}
        >
          <div className="px-6 py-6 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-slate-900 text-center">
                Disconnect Bank Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-600">
                Are you sure you want to disconnect this bank account? This action cannot be undone.
                {bankAccountToDisconnect && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 justify-center">
                      {bankAccountToDisconnect.logoUrl ? (
                        <div className="h-12 w-12 flex-shrink-0 bg-white rounded-[12px] overflow-hidden flex items-center justify-center">
                          <img
                            src={bankAccountToDisconnect.logoUrl}
                            alt={bankAccountToDisconnect.institutionName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Landmark className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {bankAccountToDisconnect.institutionName}
                        </h3>
                        <p className="text-sm text-slate-600">
                          **** {bankAccountToDisconnect.last4}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
              <Button
                onClick={confirmDisconnect}
                disabled={isDisconnecting}
                className="w-full h-14 text-white hover:opacity-90"
                style={{ backgroundColor: '#E84855' }}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisconnectDialog(false);
                  setBankAccountToDisconnect(null);
                }}
                disabled={isDisconnecting}
                className="w-full h-14"
              >
                Cancel
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
