/**
 * CashRequest Page
 * 
 * Uses CustomerScreen with 3-zone layout: header, map, footer.
 * 
 * Behavior preserved:
 * - All business logic unchanged (order creation, pricing calculation)
 * - All Supabase calls unchanged
 * - All authentication and navigation unchanged
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@/lib/icons";
import { Landmark, Pencil, ChevronDown, CheckCircle2, ArrowRight } from "lucide-react";
import LottieComponent from 'lottie-react';
import bankAnimation from '@/assets/animations/bank.json';
import addAddressAnimation from '@/assets/animations/AddAddress.json';
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { getIconByName } from "@/components/address/IconPicker";
import { cn } from "@/lib/utils";
import { FlowHeader } from "@/components/customer/FlowHeader";
import { toast } from "sonner";
import { createOrder, formatAddress, getAddressPrimaryLine, getAddressSecondaryLine } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";
import { useQueryClient } from "@tanstack/react-query";
import { clearProfileCache } from "@/hooks/useProfile";
import { strings } from "@/lib/strings";
import type { CustomerAddress } from "@/types/types";
import { calculatePricing } from "@/lib/pricing";
import CashAmountInput from "@/components/customer/CashAmountInput";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { CustomerMapViewport } from "@/components/customer/layout/CustomerMapViewport";
import { CustomerOrderFlowFooter } from "@/components/customer/layout/CustomerOrderFlowFooter";
import { RequestFlowBottomBar } from "@/components/customer/RequestFlowBottomBar";
import { track } from "@/lib/analytics";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useCustomerAddresses, useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { DeliveryModeSelector, type DeliveryMode } from "@/components/customer/DeliveryModeSelector";
import { AddressForm, type AddressFormRef } from "@/components/address/AddressForm";
import { addAddressCopy } from "@/lib/copy/addAddress";
import { useOrderDraftStore } from "@/stores/useOrderDraftStore";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SlideToConfirm } from "@/components/customer/SlideToConfirm";
import { BankingHelpStories } from "@/components/customer/BankingHelpStories";

type Step = 1 | 2 | 3;

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Constants
  const MIN_AMOUNT = 100;
  const MAX_AMOUNT = 1000;

  // Wizard state
  // Initialize step from URL param if present (for navigation back from ManageAddresses)
  const stepParam = searchParams.get('step');
  const initialStep = stepParam === '3' ? 3 : stepParam === '2' ? 2 : 1;
  const [step, setStep] = useState<Step>(initialStep);
  // Ref to track if we're updating step internally (to avoid sync conflicts)
  const isInternalStepUpdate = useRef(false);
  // Ref to track newly created address ID so we can select it after refetch
  const newlyCreatedAddressIdRef = useRef<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [amount, setAmount] = useState(300);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("count_confirm");
  const [loading, setLoading] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false); // Collapsed by default
  
  // Bank account selection
  const { bankAccounts, hasAnyBank } = useBankAccounts();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  
  // Help stories for step 3 (delivery style)
  const [showHelpStories, setShowHelpStories] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [helpButtonPosition, setHelpButtonPosition] = useState<{ top: number; right: number } | null>(null);
  
  // Order draft store for persisting order state during navigation
  const { draft, returnTo, setDraft, clearDraft } = useOrderDraftStore();
  const hasRestoredFromDraftRef = useRef(false);


  // Initialize amount and delivery mode from profile personalization (only once on mount)
  // Only run if we haven't restored from draft
  useEffect(() => {
    if (hasRestoredFromDraftRef.current) return; // Skip if we restored from draft
    
    if (profile) {
      // Set amount from usual_withdrawal_amount if available
      if (profile.usual_withdrawal_amount !== null && 
          profile.usual_withdrawal_amount >= MIN_AMOUNT && 
          profile.usual_withdrawal_amount <= MAX_AMOUNT) {
        setAmount(profile.usual_withdrawal_amount);
      }
      
      // Set delivery mode from preferred_handoff_style if available
      if (profile.preferred_handoff_style) {
        if (profile.preferred_handoff_style === 'speed') {
          setDeliveryMode('quick_handoff');
        } else if (profile.preferred_handoff_style === 'counted') {
          setDeliveryMode('count_confirm');
        }
        // 'depends' means no preselection, keep default
      }
    }
  }, [profile?.usual_withdrawal_amount, profile?.preferred_handoff_style]); // Only run when these specific fields change

  // Map center is now computed inside CustomerMapViewport using computeCustomerMapCenter

  // Sync step with URL param (for navigation back from ManageAddresses or Bank Accounts)
  // This effect only syncs URL -> state when returning from other pages
  // Internal step changes (handleBackToAddress, handleNextStep) update both state and URL directly
  useEffect(() => {
    // Skip sync if we just updated step internally
    if (isInternalStepUpdate.current) {
      isInternalStepUpdate.current = false;
      return;
    }
    
    const stepParam = searchParams.get('step');
    if (stepParam === '1' || stepParam === '2' || stepParam === '3') {
      const urlStep = stepParam === '3' ? 3 : stepParam === '2' ? 2 : 1;
      // Only update if URL step differs from current step
      // This handles returning from other pages where URL has step param
      if (urlStep !== step) {
        setStep(urlStep);
      }
    } else if (!stepParam) {
      // If URL has no step param, default to step 1
      // This handles cases where user navigates directly to /customer/request
      if (step !== 1) {
        setStep(1);
      }
    }
  }, [searchParams, step]);

  // Auto-select primary bank account when banks load
  useEffect(() => {
    if (hasAnyBank && bankAccounts.length > 0 && !selectedBankAccountId) {
      // Find primary bank account, or fall back to first account if none is primary
      const primaryBank = bankAccounts.find(ba => ba.is_primary) || bankAccounts[0];
      setSelectedBankAccountId(primaryBank.id);
    }
  }, [hasAnyBank, bankAccounts, selectedBankAccountId]);

  // Sync selectedAddressId with URL param to persist across navigation
  const selectedAddressIdFromUrl = searchParams.get('address_id');

  // Update URL when selectedAddress changes (but don't navigate)
  // Use ref to prevent infinite loops
  const lastSyncedAddressIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (step === 1 && selectedAddress) {
      // Only update URL if address actually changed and we haven't synced this address yet
      if (selectedAddressIdFromUrl !== selectedAddress.id && lastSyncedAddressIdRef.current !== selectedAddress.id) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('address_id', selectedAddress.id);
        setSearchParams(newParams, { replace: true });
        lastSyncedAddressIdRef.current = selectedAddress.id;
      }
    } else if (!selectedAddress) {
      // Reset ref when address is cleared
      lastSyncedAddressIdRef.current = null;
    }
  }, [selectedAddress?.id, step, selectedAddressIdFromUrl]);

  // Handle reorder prefilling from URL params
  // Use ref to track which params we've already processed to prevent loops
  const processedReorderParamsRef = useRef<string | null>(null);
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    const addressIdParam = searchParams.get('address_id');
    const paramsKey = `${amountParam || ''}:${addressIdParam || ''}`;
    
    // Only process if params exist and we haven't processed this exact combination
    if (amountParam && processedReorderParamsRef.current !== paramsKey) {
      const parsedAmount = parseFloat(amountParam);
      if (!isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT) {
        // Round to nearest $20 increment
        const rounded = Math.round(parsedAmount / 20) * 20;
        const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, rounded));
        setAmount(clamped);
        processedReorderParamsRef.current = paramsKey;
      }
    }
    
    // Reset ref when amount/address_id params are removed (user navigates away)
    if (!amountParam && !addressIdParam) {
      processedReorderParamsRef.current = null;
    }
  }, [searchParams]);


  // Calculate pricing (memoized so identity is stable)
  const pricing = useMemo(() => {
    if (!selectedAddress) return null;

    return calculatePricing({
      amount,
      customerAddress: {
        lat: selectedAddress.latitude || 0,
        lng: selectedAddress.longitude || 0,
      },
    });
  }, [
    amount,
    selectedAddress?.id,
    selectedAddress?.latitude,
    selectedAddress?.longitude,
  ]);

  // Handle amount change from CashAmountInput component
  const handleAmountChange = useCallback((newAmount: number) => {
    setAmount(newAmount);
    track('cash_amount_changed', {
      amount: newAmount,
      amount_range: newAmount < 200 ? 'low' : newAmount < 500 ? 'medium' : 'high',
    });
  }, []);

  const handleAddressSelect = (address: CustomerAddress) => {
    // Haptic feedback on mobile devices when selecting/expanding a card
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Light haptic feedback (10ms vibration)
      navigator.vibrate(10);
    }
    
    setSelectedAddress(address);
  };

  const { addresses } = useCustomerAddresses();
  const hasAnyAddresses = addresses.length > 0;
  const { setBottomSlot } = useCustomerBottomSlot();
  const invalidateAddresses = useInvalidateAddresses();

  // Restore from draft if returning from bank verification or navigation
  // This must run after addresses and bank accounts are loaded
  useEffect(() => {
    if (draft && !hasRestoredFromDraftRef.current && addresses.length > 0) {
      hasRestoredFromDraftRef.current = true;
      
      // Restore amount
      if (draft.amount >= MIN_AMOUNT && draft.amount <= MAX_AMOUNT) {
        setAmount(draft.amount);
      }
      
      // Restore delivery mode/style
      if (draft.deliveryStyle) {
        setDeliveryMode(draft.deliveryStyle === 'counted' ? 'count_confirm' : 'quick_handoff');
      } else if (draft.deliveryMode) {
        setDeliveryMode(draft.deliveryMode);
      }
      
      // Restore bank account
      if (draft.bankAccountId && bankAccounts.length > 0) {
        const bankExists = bankAccounts.some(b => b.id === draft.bankAccountId);
        if (bankExists) {
          setSelectedBankAccountId(draft.bankAccountId);
        }
      }
      
      // Restore address - find it in the addresses list
      if (draft.addressId) {
        const addressToRestore = addresses.find(addr => addr.id === draft.addressId);
        if (addressToRestore) {
          setSelectedAddress(addressToRestore);
          // Determine which step to restore to
          // BUT: respect the step in URL params if present (e.g., when returning from BankAccounts)
          const urlStepParam = searchParams.get('step');
          const urlStep = urlStepParam === '3' ? 3 : urlStepParam === '2' ? 2 : urlStepParam === '1' ? 1 : null;
          
          // Only auto-restore step if URL doesn't specify a step
          if (!urlStep) {
            if (draft.deliveryStyle || draft.deliveryMode) {
              // Has delivery style - restore to step 3
              if (step !== 3) {
                isInternalStepUpdate.current = true;
                setStep(3);
                const newParams = new URLSearchParams(searchParams);
                newParams.set('step', '3');
                if (draft.addressId) {
                  newParams.set('address_id', draft.addressId);
                }
                setSearchParams(newParams, { replace: true });
              }
            } else if (draft.bankAccountId) {
              // Has bank account - restore to step 2
              if (step === 1) {
                isInternalStepUpdate.current = true;
                setStep(2);
                const newParams = new URLSearchParams(searchParams);
                newParams.set('step', '2');
                if (draft.addressId) {
                  newParams.set('address_id', draft.addressId);
                }
                setSearchParams(newParams, { replace: true });
              }
            }
          } else {
            // URL specifies a step - respect it (e.g., returning from BankAccounts with step=2)
            if (step !== urlStep) {
              isInternalStepUpdate.current = true;
              setStep(urlStep);
            }
          }
        }
      }
      
      // Show success toast if returning from bank verification
      if (returnTo === 'order-review') {
        toast.success("Bank verified! Your order details have been restored.", {
          duration: 3000,
        });
      }
    }
  }, [draft, returnTo, addresses, bankAccounts, step, searchParams, setSearchParams]);

  // Auto-advance to step 2 when reordering with address_id
  // This runs separately and waits for address to be selected
  const hasAutoAdvancedRef = useRef(false);
  useEffect(() => {
    const addressIdParam = searchParams.get('address_id');
    const amountParam = searchParams.get('amount');
    const stepParam = searchParams.get('step');
    
    // Reset auto-advance flag when params change
    if (hasAutoAdvancedRef.current && (!addressIdParam || !amountParam)) {
      hasAutoAdvancedRef.current = false;
    }
    
    // Only auto-advance if:
    // 1. We're on step 1
    // 2. We have address_id and amount params (reorder scenario)
    // 3. URL does NOT explicitly specify step=1 (which means stay on step 1)
    // 4. The address from URL param is actually selected
    // 5. Addresses have loaded
    // 6. We haven't already auto-advanced
    if (step === 1 && addressIdParam && amountParam && stepParam !== '1' && addresses.length > 0 && !hasAutoAdvancedRef.current) {
      // Check if the address from URL is selected
      const isAddressSelected = selectedAddress?.id === addressIdParam;
      
      if (isAddressSelected) {
        // Address is selected, advance to step 2
        hasAutoAdvancedRef.current = true;
        isInternalStepUpdate.current = true;
        setStep(2);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('step', '2');
        setSearchParams(newParams, { replace: true });
      } else if (selectedAddressIdFromUrl === addressIdParam && stepParam !== '1') {
        // Address param exists but not selected yet - wait a bit for selection to happen
        // This handles the case where addresses are still loading
        // Only do this if step=1 is NOT explicitly in URL (which means stay on step 1)
        const timeoutId = setTimeout(() => {
          // Check again if address is now selected and step=1 is not in URL
          const currentStepParam = searchParams.get('step');
          if (selectedAddress?.id === addressIdParam && step === 1 && currentStepParam !== '1' && !hasAutoAdvancedRef.current) {
            hasAutoAdvancedRef.current = true;
            isInternalStepUpdate.current = true;
            setStep(2);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('step', '2');
            setSearchParams(newParams, { replace: true });
          }
        }, 500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [step, selectedAddress?.id, addresses.length, searchParams, setSearchParams, selectedAddressIdFromUrl]);

  // Modal state for adding address
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const addAddressFormRef = useRef<AddressFormRef>(null);
  const [addAddressLoading, setAddAddressLoading] = useState(false);

  // Modal state for editing address
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const editAddressFormRef = useRef<AddressFormRef>(null);
  const [editAddressLoading, setEditAddressLoading] = useState(false);

  // Force select newly created address after refetch completes
  // This is a safety net to ensure the new address is selected even if the immediate selection didn't work
  useEffect(() => {
    if (!newlyCreatedAddressIdRef.current || addresses.length === 0) return;

    const newAddress = addresses.find(a => a.id === newlyCreatedAddressIdRef.current);
    if (newAddress) {
      // Force select the newly created address
      setSelectedAddress(newAddress);
      newlyCreatedAddressIdRef.current = null; // Clear ref after selecting
    }
  }, [addresses]);

  // Auto-select first address when addresses load or when returning from Manage Addresses
  // Also restore address when returning from Bank Accounts on step 2
  // Use URL param to persist selection across navigation (same mechanism as cash amount -> address select)
  // 
  // IMPORTANT: This effect must NOT override a selection that was just made via handleSaveAddress
  // The selection state (selectedAddress) is the source of truth - this effect only initializes it
  // Use ref to track last restored address ID to prevent infinite loops
  const lastRestoredAddressIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Priority 1: Restore from URL param if it exists (CRITICAL for reorder flow)
    // This must happen FIRST, even before checking if addresses are loaded
    // This handles reorder scenarios where we need to select a specific address
    if (selectedAddressIdFromUrl) {
      // Only restore if we haven't already restored this address ID
      if (lastRestoredAddressIdRef.current !== selectedAddressIdFromUrl) {
        // Try to find the address in the current addresses list
        const restored = addresses.find(a => a.id === selectedAddressIdFromUrl);
        if (restored) {
          // Address found - select it immediately
          if (!selectedAddress || selectedAddress.id !== restored.id) {
            setSelectedAddress(restored);
            lastRestoredAddressIdRef.current = selectedAddressIdFromUrl;
            return; // Exit early - don't run other selection logic
          }
        } else if (addresses.length > 0) {
          // Address not found in list - this shouldn't happen in reorder flow
          // but if it does, we'll fall through to other logic
          console.warn('[CashRequest] Address from URL param not found in addresses list:', selectedAddressIdFromUrl);
        }
        // If addresses haven't loaded yet, we'll wait and try again when they load
      } else if (selectedAddress?.id === selectedAddressIdFromUrl) {
        // Already restored and matches - update ref to be safe
        lastRestoredAddressIdRef.current = selectedAddressIdFromUrl;
        return;
      }
    }

    // No addresses at all → clear selection (unless we're waiting for URL param address)
    if (addresses.length === 0) {
      if (selectedAddress && !selectedAddressIdFromUrl) {
        setSelectedAddress(null);
        lastRestoredAddressIdRef.current = null;
      }
      return;
    }

    // Check if current selection is valid (exists in addresses array)
    const hasValidSelection = selectedAddress && addresses.some(a => a.id === selectedAddress.id);

    // Priority 2: If we have a valid selection, don't override it (preserve manual selections)
    // This includes newly created addresses that were just selected via handleSaveAddress
    if (hasValidSelection) {
      // Update ref to match current selection
      if (selectedAddress) {
        lastRestoredAddressIdRef.current = selectedAddress.id;
      }
      return;
    }

    // Priority 3: Only auto-select first address on step 1 (not step 2)
    // Step 2 should only be accessible after selecting an address, so we shouldn't auto-select here
    // This only runs when there's NO selection at all (initial load) AND no URL param
    // IMPORTANT: Don't auto-select if we have a URL param - wait for it to be restored
    if (step === 1 && !selectedAddress && !selectedAddressIdFromUrl) {
      const firstAddress = addresses[0];
      if (firstAddress) {
        setSelectedAddress(firstAddress);
        lastRestoredAddressIdRef.current = firstAddress.id;
      }
    }
  }, [
    addresses,
    step,
    selectedAddress,
    selectedAddressIdFromUrl,
  ]);

  // Handlers for address management
  const handleAddAddress = useCallback(() => {
    setShowAddAddressModal(true);
    track('add_address_clicked', { source: 'cash_request_step_1' });
  }, []);

  const handleSaveAddress = useCallback((address: CustomerAddress) => {
    setAddAddressLoading(false);
    setShowAddAddressModal(false);
    // Store the new address ID so we can select it after refetch completes
    newlyCreatedAddressIdRef.current = address.id;
    // Select the newly created address IMMEDIATELY - this is the source of truth
    // Do this BEFORE invalidating so the selection is set before any refetch effects run
    setSelectedAddress(address);
    track('address_created', { source: 'cash_request_step_1' });
    // Invalidate addresses in the background (non-blocking)
    invalidateAddresses();
  }, [invalidateAddresses]);

  const handleCloseAddAddressModal = useCallback(() => {
    setShowAddAddressModal(false);
  }, []);

  const handleSaveAddAddress = useCallback(() => {
    if (addAddressFormRef.current) {
      addAddressFormRef.current.submit();
    }
  }, []);

  // Handle editing address
  const handleEditAddress = useCallback((address: CustomerAddress) => {
    setEditingAddress(address);
    setShowEditAddressModal(true);
  }, []);

  const handleCloseEditAddressModal = useCallback(() => {
    setShowEditAddressModal(false);
    setEditingAddress(null);
  }, []);

  const handleSaveEditAddress = useCallback(async (updatedAddress: CustomerAddress) => {
    await invalidateAddresses();
    // If the edited address was selected, update the selection
    if (selectedAddress?.id === updatedAddress.id) {
      setSelectedAddress(updatedAddress);
    }
    handleCloseEditAddressModal();
    track('address_updated', { source: 'cash_request_step_1' });
  }, [invalidateAddresses, selectedAddress, handleCloseEditAddressModal]);

  const handleSaveEditAddressForm = useCallback(() => {
    if (editAddressFormRef.current) {
      editAddressFormRef.current.submit();
    }
  }, []);

  // Sync loading state from form
  useEffect(() => {
    if (addAddressFormRef.current && showAddAddressModal) {
      addAddressFormRef.current.setLoadingCallback(setAddAddressLoading);
    }
  }, [showAddAddressModal]);

  // Sync loading state from edit form
  useEffect(() => {
    if (editAddressFormRef.current && showEditAddressModal) {
      editAddressFormRef.current.setLoadingCallback(setEditAddressLoading);
    }
  }, [showEditAddressModal]);
  
  // Clean logic: button is disabled if no addresses or no address is selected
  // We derive hasAnyAddresses from the addresses array to guarantee it's always in sync
  const isContinueDisabled = !hasAnyAddresses || !selectedAddress;
  
  const handleNextStep = useCallback(() => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }
    // Save draft before moving to step 2
    setDraft({
      addressId: selectedAddress.id,
      amount,
      bankAccountId: selectedBankAccountId || undefined,
    });
    // Save the current carousel index before moving to next step
    // This will be restored when returning to address selection
    // Note: The index is saved via onCarouselIndexChange callback
    isInternalStepUpdate.current = true;
    setStep(2);
    // Update URL to reflect step 2
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', '2');
    if (selectedAddress.id) {
      newParams.set('address_id', selectedAddress.id);
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedAddress, amount, selectedBankAccountId, setDraft, searchParams, setSearchParams]);
  
  const handleNextToDeliveryStyle = useCallback(() => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }
    if (!hasAnyBank || !selectedBankAccountId) {
      toast.error("Please connect a bank account to continue");
      return;
    }
    // Save draft before moving to step 3 (without deliveryStyle - user will select it on step 3)
    setDraft({
      addressId: selectedAddress.id,
      amount,
      bankAccountId: selectedBankAccountId,
      // Don't save deliveryStyle here - it will be saved when user selects it on step 3
    });
    isInternalStepUpdate.current = true;
    setStep(3);
    // Update URL to reflect step 3
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', '3');
    if (selectedAddress.id) {
      newParams.set('address_id', selectedAddress.id);
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedAddress, amount, selectedBankAccountId, hasAnyBank, setDraft, searchParams, setSearchParams]);
  
  // CRITICAL: Update draft whenever deliveryMode changes on step 3
  // This ensures the selected delivery style is saved to draft before order creation
  useEffect(() => {
    if (step === 3 && selectedAddress && selectedBankAccountId) {
      setDraft({
        addressId: selectedAddress.id,
        amount,
        bankAccountId: selectedBankAccountId,
        deliveryStyle: deliveryMode === 'count_confirm' ? 'counted' : 'speed',
      });
      console.log('[CashRequest] Draft updated with delivery style:', {
        step,
        deliveryMode,
        deliveryStyle: deliveryMode === 'count_confirm' ? 'counted' : 'speed',
      });
    }
  }, [step, deliveryMode, selectedAddress, amount, selectedBankAccountId, setDraft]);
  
  const handleBackToAddress = useCallback(() => {
    // Update both state and URL when going back to address selection
    isInternalStepUpdate.current = true;
    setStep(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', '1');
    // Preserve address_id if we have a selected address
    if (selectedAddress?.id) {
      newParams.set('address_id', selectedAddress.id);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, selectedAddress?.id]);

  const handleBackToAmount = useCallback(() => {
    // Update both state and URL when going back to amount/bank selection
    isInternalStepUpdate.current = true;
    setStep(2);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', '2');
    // Preserve address_id if we have a selected address
    if (selectedAddress?.id) {
      newParams.set('address_id', selectedAddress.id);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, selectedAddress?.id]);
  
  const handleBackToHome = useCallback(() => {
    // Clear order draft when user explicitly cancels/closes the cash request flow
    clearDraft();
    // Reset selected address when going back to home (starting a new request)
    setSelectedAddress(null);
    navigate('/customer/home');
  }, [navigate, clearDraft]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }

    if (!pricing) {
      toast.error("Unable to calculate pricing");
      return;
    }

    if (!deliveryMode) {
      toast.error("Please select a delivery style");
      return;
    }

    if (!selectedBankAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    // Validate draft has all required fields
    // Use current deliveryMode as source of truth (user might have just changed it)
    const currentDeliveryStyle = deliveryMode === 'count_confirm' ? 'counted' : 'speed';
    if (!draft?.addressId || !draft?.bankAccountId || !draft?.amount || !deliveryMode) {
      toast.error("Missing order information. Please go back and complete all steps.");
      return;
    }

    if (profile && profile.daily_usage + pricing.total > profile.daily_limit) {
      toast.error(`${strings.customer.dailyLimitExceeded} $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

    // Track order submission (no PII - no addresses, emails, phone numbers)
    track('order_submitted', {
      amount: amount,
      total_cost: pricing.total,
      platform_fee: pricing.platformFee,
      compliance_fee: pricing.complianceFee,
      delivery_fee: pricing.deliveryFee,
      delivery_mode: deliveryMode,
      has_delivery_notes: !!selectedAddress.delivery_notes,
    });

    setLoading(true);
    try {
      const deliveryNotes = selectedAddress.delivery_notes || "";
      
      // CRITICAL: Use current deliveryMode as source of truth, with draft as fallback
      // This ensures we always use what the user has selected, not what was saved earlier
      const deliveryStyleFromMode = deliveryMode === 'count_confirm' ? 'counted' : 'speed';
      const deliveryStyleFromDraft = draft.deliveryStyle;
      
      // Prefer current deliveryMode over draft (user might have changed it)
      const finalDeliveryStyleLowercase = deliveryStyleFromMode || deliveryStyleFromDraft || 'speed';
      const deliveryStyle = finalDeliveryStyleLowercase === 'counted' ? 'COUNTED' as const : 'SPEED' as const;
      
      // Debug logging for delivery style mapping
      console.log('[CashRequest] Creating order with delivery style:', {
        currentDeliveryMode: deliveryMode,
        deliveryStyleFromMode,
        draftDeliveryStyle: draft.deliveryStyle,
        finalDeliveryStyleLowercase,
        mappedStyle: deliveryStyle,
        willBeSavedAs: deliveryStyle,
      });
      
      // CRITICAL VALIDATION: Ensure deliveryStyle is set correctly
      if (!finalDeliveryStyleLowercase || (finalDeliveryStyleLowercase !== 'counted' && finalDeliveryStyleLowercase !== 'speed')) {
        console.error('[CashRequest] ❌ INVALID deliveryStyle:', {
          finalDeliveryStyleLowercase,
          deliveryMode,
          draftDeliveryStyle: draft.deliveryStyle,
        });
        toast.error("Delivery style is missing. Please select a delivery style.");
        return;
      }
      
      const order = await createOrder(
        amount,
        formatAddress(selectedAddress),
        deliveryNotes || undefined,
        selectedAddress.id,
        deliveryMode === "count_confirm" ? "COUNTED" : "SPEED",
        selectedBankAccountId || undefined // Pass selected bank account ID
      );
      
      // CRITICAL: Verify the order was created with the correct delivery style
      if (order) {
        console.log('[CashRequest] Order created, verifying delivery style:', {
          requested: deliveryStyle,
          saved: (order as any).delivery_style,
          matches: (order as any).delivery_style === deliveryStyle,
        });
        
        if ((order as any).delivery_style !== deliveryStyle) {
          console.error('[CashRequest] ❌ DELIVERY STYLE MISMATCH!', {
            requested: deliveryStyle,
            saved: (order as any).delivery_style,
            orderId: order.id,
          });
          toast.error(`Warning: Delivery style may not have been saved correctly. Expected: ${deliveryStyle}, Got: ${(order as any).delivery_style}`);
        }
        // Clear draft after successful order creation
        clearDraft();
        hasRestoredFromDraftRef.current = false;
        
        // Invalidate profile cache to update daily_usage immediately
        clearProfileCache();
        if (profile?.id) {
          await queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
          await queryClient.refetchQueries({ queryKey: ['profile', profile.id] });
        }
        
        toast.success(strings.toasts.orderPlaced);
        navigate(`/customer/deliveries/${order.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error?.message || error?.error?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, pricing, profile, draft, navigate, clearDraft, queryClient]);

  // Memoize the summary section (everything including breakdown) - stable reference
  // MUST be before any conditional returns to follow Rules of Hooks
  const summarySection = useMemo(() => {
    return (
      <div className="w-full mt-6">
        {/* Summary Section - No wrapper, directly in main component */}
        <button
          type="button"
          onClick={() => {
            const newState = !showFeeDetails;
            setShowFeeDetails(newState);
            track('fee_breakdown_toggled', {
              is_expanded: newState,
            });
          }}
          className="w-full text-left cursor-pointer active:opacity-95 transition-opacity"
        >
          {/* Top Row - You'll Get */}
          <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
            <span className="text-sm text-slate-800">You'll Get</span>
            <motion.span
              key={`get-${amount}`}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-slate-900"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </motion.span>
          </div>

          {/* Expandable breakdown content */}
          <div
            className="overflow-hidden"
            style={{
              marginBottom: "6px",
            }}
          >
            {/* Expandable container for breakdown content */}
            <div
              className="overflow-hidden"
              style={{
                maxHeight: showFeeDetails ? 220 : 0,
                transition: "max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                boxSizing: "border-box",
                willChange: "max-height",
              }}
            >
              {/* Breakdown content - fades in when expanded */}
              {pricing && (
                <div
                  style={{
                    padding: "12px 0",
                    backgroundColor: "transparent",
                    opacity: showFeeDetails ? 1 : 0,
                    transition: "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    pointerEvents: showFeeDetails ? "auto" : "none",
                    boxSizing: "border-box",
                  }}
                >
                    <div className="flex justify-between items-center text-sm" style={{ marginBottom: '8px' }}>
                      <span className="text-slate-600">Platform Fee</span>
                      <span className="text-slate-900 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        +${pricing.platformFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm" style={{ marginBottom: '8px' }}>
                      <span className="text-slate-600">Compliance Fee</span>
                      <span className="text-slate-900 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        +${pricing.complianceFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Runner Fee</span>
                      <span className="text-slate-900 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        +${pricing.deliveryFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Bottom Row - You'll Pay */}
          <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
            <span className="text-sm text-slate-800">You'll Pay</span>
            <motion.span
              key={`pay-${pricing?.total || 0}`}
              initial={{ opacity: 0.6, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-slate-900"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              ${pricing?.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </motion.span>
          </div>

          {/* Chevron Icon (no white circle) */}
          <div className="flex justify-center items-center">
            <motion.div
              animate={{ rotate: showFeeDetails ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown className="h-4 w-4 text-slate-900" />
            </motion.div>
          </div>
        </button>
      </div>
    );
  }, [pricing, amount, showFeeDetails]);

  // Handle navigate to manage addresses - pass return path with address_id and step=1 preserved
  // Explicitly include step=1 to prevent draft restoration from advancing to step 2
  const handleManageAddressesFromSelect = useCallback(() => {
    // Build return path with step=1 and address_id if available
    if (selectedAddress?.id) {
      const returnPath = encodeURIComponent(`/customer/request?step=1&address_id=${selectedAddress.id}`);
      navigate(`/customer/addresses?return=${returnPath}`);
    } else {
      const returnPath = encodeURIComponent('/customer/request?step=1');
      navigate(`/customer/addresses?return=${returnPath}`);
    }
  }, [navigate, selectedAddress?.id]);

  // Handle navigate to bank accounts - will eventually lead to banking integrations
  const handleBankAccounts = useCallback(() => {
    // Navigate to bank accounts page with return path to cash request
    // Ensure step=2 is included in the return path so we return to cash amount step
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', '2');
    const returnPath = `/customer/request?${newParams.toString()}`;
    navigate('/customer/banks', { state: { returnPath } });
  }, [navigate, searchParams]);

  // Memoize flow header for all steps
  const flowHeader = useMemo(() => {
    if (step === 1) {
      return (
        <FlowHeader
          step={1}
          totalSteps={3}
          mode="cancel"
          onPrimaryNavClick={handleBackToHome}
          title="Where should we deliver?"
          subtitle="Choose where you'd like your cash delivered."
          onSecondaryAction={handleManageAddressesFromSelect}
          showSecondaryAction={true}
        />
      );
    } else if (step === 2) {
      return (
        <FlowHeader
          step={2}
          totalSteps={3}
          mode="back"
          onPrimaryNavClick={handleBackToAddress}
          title="How much cash do you need?"
          subtitle="Choose a bank account and cash amount."
          onSecondaryAction={handleBankAccounts}
          showSecondaryAction={true}
          secondaryActionIcon={Landmark}
          secondaryActionLabel="My Bank Accounts"
        />
      );
    } else {
      return (
        <FlowHeader
          step={3}
          totalSteps={3}
          mode="back"
          onPrimaryNavClick={handleBackToAmount}
          title="How would you like it delivered?"
          subtitle="Choose a delivery style and confirm your request."
          showHelp={true}
          helpButtonRef={helpButtonRef}
          onHelpClick={() => {
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
        />
      );
    }
  }, [step, handleBackToHome, handleBackToAddress, handleBackToAmount, handleManageAddressesFromSelect, handleBankAccounts]);

  // Fixed content for step 2 (cash amount) - divider under title
  const cashAmountFixedContent = step === 2 ? (
    <>
      {/* Divider under title/subtitle - 24px spacing from subtitle (fixed, doesn't scroll) */}
      <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
    </>
  ) : null;

  // Fixed content for step 3 (delivery style) - divider under title
  const deliveryStyleFixedContent = step === 3 ? (
    <>
      {/* Divider under title/subtitle - 24px spacing from subtitle (fixed, doesn't scroll) */}
      <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
    </>
  ) : null;

  // Get selected bank account
  const selectedBankAccount = useMemo(() => {
    if (!selectedBankAccountId) return null;
    return bankAccounts.find(b => b.id === selectedBankAccountId) || null;
  }, [bankAccounts, selectedBankAccountId]);

  // Memoize the entire topContent to prevent remounting
  // MUST be before any conditional returns to follow Rules of Hooks
  // Premium spacing: 24px padding overall, clear vertical sections
  const topContent = useMemo(() => {
    if (step === 2) {
      // Cash amount + bank selection page
      return (
        <div className="space-y-0" style={{ minHeight: "180px" }}>
          {/* Bank Account Selection Section */}
          <div className="pt-3">
          {!hasAnyBank ? (
              // No bank connected - show connect prompt
              <div className="w-full rounded-xl bg-white px-4 py-4 mb-6">
                <div className="space-y-4">
                  {/* Animated bank icon - centered */}
                  <div className="flex justify-center">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <LottieComponent
                        animationData={bankAnimation}
                        loop={false}
                        autoplay={true}
                        style={{ width: '48px', height: '48px' }}
                      />
                  </div>
                  </div>
                  
                  {/* Header - centered */}
                  <div className="flex items-center justify-center">
                    <span className="text-base font-semibold text-slate-900">Connect Your Bank Account</span>
                  </div>
                  
                  {/* Benefit bullets - centered */}
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#13F287' }} />
                      <span className="text-sm text-slate-700">Unlock cash requests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#13F287' }} />
                      <span className="text-sm text-slate-700">Faster refunds & support</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleBankAccounts}
                    className="w-full h-14 bg-black text-white hover:bg-black/90 font-semibold flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              // Bank accounts exist - show selection
              <div className="mb-6">
                {bankAccounts.length === 1 ? (
                  // Single bank - show without dropdown
                  <div className="w-full py-3 flex items-center gap-3">
                    {selectedBankAccount?.bank_institution_logo_url ? (
                      <div className="h-12 w-12 rounded-[12px] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                        <img
                          src={selectedBankAccount.bank_institution_logo_url}
                          alt={selectedBankAccount.bank_institution_name || 'Bank'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Landmark className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {selectedBankAccount?.bank_institution_name || 'Bank Account'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        **** {selectedBankAccount?.bank_last4 || ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Multiple banks - show dropdown
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => setShowBankDropdown(!showBankDropdown)}
                      className="w-full py-3 flex items-center gap-3"
                    >
                      {selectedBankAccount?.bank_institution_logo_url ? (
                        <div className="h-12 w-12 rounded-[12px] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                          <img
                            src={selectedBankAccount.bank_institution_logo_url}
                            alt={selectedBankAccount.bank_institution_name || 'Bank'}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Landmark className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {selectedBankAccount?.bank_institution_name || 'Bank Account'}
                        </h3>
                        <p className="text-sm text-slate-600">
                          **** {selectedBankAccount?.bank_last4 || ''}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-[#F7F7F7] flex items-center justify-center flex-shrink-0 pointer-events-none">
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-slate-600 transition-transform duration-300 ease-in-out",
                            showBankDropdown && "rotate-180"
                          )}
                        />
                      </div>
                    </button>
                    {/* Expandable dropdown container with smooth animation */}
                    <div
                      className={cn(
                        "overflow-hidden relative",
                        showBankDropdown 
                          ? "max-h-[500px] opacity-100" 
                          : "max-h-0 opacity-0"
                      )}
                      style={{
                        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <div 
                        className="mt-2 space-y-2"
                        style={{
                          opacity: showBankDropdown ? 1 : 0,
                          transition: showBankDropdown
                            ? "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s" // Fade in 50ms after expansion starts
                            : "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)", // Fade out immediately when collapsing
                        }}
                      >
                        {bankAccounts.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => {
                              setSelectedBankAccountId(bank.id);
                              setShowBankDropdown(false);
                            }}
                            className={cn(
                              "w-full py-3 flex items-center gap-3",
                              selectedBankAccountId === bank.id
                                ? "bg-white"
                                : ""
                            )}
                          >
                            {bank.bank_institution_logo_url ? (
                              <div className="h-12 w-12 rounded-[12px] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                                <img
                                  src={bank.bank_institution_logo_url}
                                  alt={bank.bank_institution_name || 'Bank'}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Landmark className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <h3 className="text-base font-semibold text-slate-900 truncate">
                                {bank.bank_institution_name || 'Bank Account'}
                              </h3>
                              <p className="text-sm text-slate-600">
                                **** {bank.bank_last4}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-[#F7F7F7] flex items-center justify-center flex-shrink-0 pointer-events-none">
                              {selectedBankAccountId === bank.id && (
                                <div className="h-5 w-5 rounded-full bg-black flex items-center justify-center">
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider between bank selection and cash amount */}
          <div>
            <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
          </div>

          {/* Cash Amount Section */}
          <div style={{ paddingTop: '24px' }}>
            <CashAmountInput
              value={amount}
              onChange={handleAmountChange}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={20}
              hideAmountDisplay={false}
            />
          </div>

          {/* Summary Section */}
          <div style={{ paddingTop: '24px' }}>
            {summarySection}
          </div>
        </div>
      );
    } else if (step === 3) {
      // Delivery style + OTP education page
      return (
        <div className="space-y-0" style={{ minHeight: "180px" }}>
          {/* 24px spacing from fixed divider to delivery style */}
          <div style={{ paddingTop: '24px' }}>
            <DeliveryModeSelector
              value={deliveryMode}
              onChange={(mode) => setDeliveryMode(mode)}
            />
          </div>

          {/* Divider */}
          <div style={{ paddingTop: '24px' }}>
            <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
          </div>

          {/* At Delivery - OTP Education */}
          <div style={{ paddingTop: '24px' }}>
            <div className="w-full rounded-xl" style={{ padding: '18px', backgroundColor: '#FFFBEB' }}>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  At Delivery
                </p>
                <div className="h-[1px] mb-3 w-full" style={{ backgroundColor: '#D97708' }} />
                <p className="text-sm text-slate-600">
                  When your runner arrives, you'll see a 4-digit PIN in the app. Share it in person to receive your cash.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Step 1 (address selection) - no topContent here, handled separately
    return null;
  }, [
    step,
    amount,
    handleAmountChange,
    summarySection,
    pricing,
    deliveryMode,
    hasAnyBank,
    bankAccounts,
    selectedBankAccountId,
    selectedBankAccount,
    showBankDropdown,
    handleBankAccounts,
  ]);

  // Help story pages for delivery style (Step 3)
  const deliveryStyleHelpPages = useMemo(() => [
    {
      id: "page-1",
      content: (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">The hand-off</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              When your runner arrives, you'll see a 4-digit PIN.
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Share it in person to receive your cash.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "page-2",
      content: (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Counted vs Discreet</h2>
            <div className="space-y-3">
              <p className="text-base text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-900">Counted:</span> Count together before confirming
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-900">Discreet:</span> Quick hand-off, no counting
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "page-3",
      content: (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Staying safe</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Only share your PIN in person. Benjamin will never ask for it remotely.
            </p>
          </div>
        </div>
      ),
    },
  ], []);

  // Memoize terms content for footer
  const termsContent = useMemo(() => {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
        <span>By confirming, you agree to Benjamin's terms</span>
        <InfoTooltip
          label="Order cancellation policy"
          side="top"
          align="center"
        >
          Once a runner begins preparing your order, it can't be changed or cancelled.
        </InfoTooltip>
      </div>
    );
  }, []);

  // Memoize footer to prevent infinite re-renders
  const footer = useMemo(() => {
    if (step === 1) {
      return (
        <CustomerOrderFlowFooter
          mode="address"
          onPrimary={handleNextStep}
          onAddAddress={addresses.length > 0 ? handleAddAddress : undefined}
          isLoading={false}
          primaryDisabled={isContinueDisabled}
        />
      );
    }
    if (step === 2) {
      // Step 2: Disable CTA if no bank connected
      const isStep2Disabled = loading || !selectedAddress || !pricing || !hasAnyBank || !selectedBankAccountId;
      return (
        <RequestFlowBottomBar
          mode="amount"
          onPrimary={handleNextToDeliveryStyle}
          isLoading={loading}
          primaryDisabled={isStep2Disabled}
          primaryLabel="Continue to Delivery Style"
          termsContent={
            !hasAnyBank ? (
              <div className="text-xs text-slate-500 text-center">
                Add a bank account to continue.
              </div>
            ) : undefined
          }
        />
      );
    }
    if (step === 3) {
      // Step 3: Slide to Confirm
      return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto space-y-3">
            {termsContent}
            <SlideToConfirm
              onConfirm={handleSubmit}
              disabled={loading || !selectedAddress || !pricing || !selectedBankAccountId || !deliveryMode}
              label="Slide to Confirm Request"
              isLoading={loading}
              loadingLabel="Creating order..."
            />
          </div>
        </div>
      );
    }
    return null;
  }, [
    step,
    handleNextStep,
    handleNextToDeliveryStyle,
    handleBackToAddress,
    handleSubmit,
    handleAddAddress,
    loading,
    selectedAddress,
    pricing,
    isContinueDisabled,
    deliveryMode,
    termsContent,
    addresses.length,
    hasAnyBank,
    selectedBankAccountId,
  ]);

  // Set bottom slot - only depends on memoized footer and stable setBottomSlot
  useEffect(() => {
    setBottomSlot(footer);
    return () => setBottomSlot(null);
  }, [setBottomSlot, footer]);

  // iOS-style spring physics configuration for modal
  const iosSpring = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 0.5,
  };

  // Step 1: Address Selection
  // 
  // REFACTORED: Expandable address cards with per-card map previews
  // - Removed fixed map at top
  // - Each address card can expand to show its own map
  // - Only one card expanded at a time (based on selectedAddress)
  // - Smooth CSS transitions for expand/collapse
  // - Auto-scroll to selected card when switching addresses
  //
  // Previous layout:
  // [FlowHeader]
  // [Fixed MapPreview showing selected address]
  // [Saved locations list]
  // [Add Another Address]
  // [Bottom CTA]
  //
  // New layout:
  // [FlowHeader]
  // [Saved locations title]
  // [Expandable address cards with individual map previews]
  // [Add Another Address]
  // [Bottom CTA]

  // Refs for scroll behavior - one ref per address card (must be before conditional returns)
  const addressCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected card when selection changes (must be before conditional returns)
  // Smooth scrolling: when expanding a card, ensure the full expanded card is visible
  // Special handling for first card: align its top with the top of scrollable area
  useEffect(() => {
    if (step === 1 && selectedAddress?.id) {
      const cardElement = addressCardRefs.current.get(selectedAddress.id);
      if (cardElement) {
        // Wait for expansion animation to start (150ms delay)
        // This gives the card time to begin expanding before we calculate scroll position
        const scrollTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            const rect = cardElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const viewportBottom = windowHeight - 120; // Account for bottom nav (~120px)
            
            // Expanded card height estimate: map (272px with padding) + content (~48px) = 320px
            const expandedCardHeight = 320;
            
            // Calculate where the bottom of the expanded card would be (using current top position)
            const expandedBottom = rect.top + expandedCardHeight;
            
            // Find the scrollable container (main element)
            const scrollContainer = cardElement.closest('main');
            if (!scrollContainer) return;
            
            const containerRect = scrollContainer.getBoundingClientRect();
            const currentScrollTop = scrollContainer.scrollTop;
            
            // Card's absolute position relative to the scroll container
            const cardOffsetTop = currentScrollTop + (rect.top - containerRect.top);
            
            // Check if the expanded card would be fully visible
            const wouldBeFullyVisible = 
              rect.top >= containerRect.top && // Top is at or below the top of scrollable area
              expandedBottom <= viewportBottom; // Bottom is at or above bottom of viewport
            
            // Only scroll if the expanded card wouldn't be fully visible
            if (!wouldBeFullyVisible) {
              // Distance from top of scrollable area to top of card (negative if card is above viewport)
              const distanceFromScrollTop = rect.top - containerRect.top;
              
              // Distance from bottom of viewport to bottom of expanded card (positive if card extends below viewport)
              const distanceFromBottom = expandedBottom - viewportBottom;
              
              // Determine if card is closer to top edge or bottom edge
              // If card is partially or fully above the scrollable area, or closer to top, align top
              // Otherwise, if card extends below viewport, align bottom
              const shouldAlignTop = 
                distanceFromScrollTop < 0 || // Card is above scrollable area
                (Math.abs(distanceFromScrollTop) < distanceFromBottom && distanceFromScrollTop <= 0); // Closer to top
              
              let targetScrollTop: number;
              
              if (shouldAlignTop) {
                // Scroll so top of card aligns with top of scrollable viewport
                // This ensures the expanded map starts just below the fixed title
                // Target: card top (cardOffsetTop) should be at 0 relative to scroll container
                targetScrollTop = cardOffsetTop;
              } else {
                // Scroll so bottom of expanded card aligns with bottom of viewport
                // Target: card bottom (cardOffsetTop + expandedCardHeight) should be at viewportBottom relative to container
                targetScrollTop = cardOffsetTop + expandedCardHeight - (viewportBottom - containerRect.top);
              }
              
              // Smoothly scroll to the calculated position
              scrollContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth',
              });
            }
            // If card is already fully visible, no need to scroll
          });
        }, 150); // 150ms delay to let expansion animation start

        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [selectedAddress?.id, step]);

  if (step === 1) {
    // Fixed title - only show when addresses exist
    // Note: fixedContent has pt-6 (24px) = 24px spacing from subtitle to divider
    // This matches the spacing used in cash amount page (step 2) for consistency
    const addressFixedContent = addresses.length > 0 ? (
      <>
        {/* Divider under title/subtitle - 24px spacing from subtitle (matches cash amount page) */}
        <div className="h-[6px] bg-[#F7F7F7] -mx-6 mb-6" />
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase pb-1.5">
          Saved locations
        </p>
      </>
    ) : (
      <>
        {/* Divider under title/subtitle - 24px spacing from subtitle (matches cash amount page) */}
        <div className="h-[6px] bg-[#F7F7F7] -mx-6 mb-6" />
      </>
    );

    // Scrollable content: expandable address cards (title is fixed above)
    const addressScrollableContent = (
      <div className="space-y-4 pb-6">
        {/* 0 addresses – empty state */}
        {addresses.length === 0 && (
          <div className="w-full rounded-xl bg-white px-4 py-4">
            <div className="space-y-4">
              {/* Animated address icon - centered */}
              <div className="flex justify-center">
                <div className="w-12 h-12 flex items-center justify-center">
                  <LottieComponent
                    animationData={addAddressAnimation}
                    loop={false}
                    autoplay={true}
                    style={{ width: '48px', height: '48px' }}
                  />
            </div>
              </div>
              
              {/* Header - centered */}
              <div className="flex items-center justify-center">
                <span className="text-base font-semibold text-slate-900">Add Your First Address</span>
              </div>
              
              {/* Subtitle - centered */}
              <div className="flex items-center justify-center">
                <p className="text-sm text-slate-700 text-center">
                Save a place where you'd like cash delivered.
                <br />
                You can add more later.
              </p>
            </div>
              
            <Button
              type="button"
              onClick={handleAddAddress}
                className="w-full h-14 bg-black text-white hover:bg-black/90 font-semibold"
            >
              Add Address
            </Button>
            </div>
          </div>
        )}

        {/* 1+ addresses – expandable address cards with map previews */}
        {addresses.length > 0 && (
          <div className="space-y-3">
            {addresses.map((addr) => {
              const isSelected = selectedAddress?.id === addr.id;

              // Set ref callback for this address card
              const setCardRef = (el: HTMLDivElement | null) => {
                if (el) {
                  addressCardRefs.current.set(addr.id, el);
                } else {
                  addressCardRefs.current.delete(addr.id);
                }
              };

              return (
                <div
                  key={addr.id}
                  ref={setCardRef}
                  className={cn(
                    "w-full border bg-white overflow-hidden",
                    "transition-all duration-300 ease-in-out",
                    isSelected
                      ? "border-2 border-black rounded-[24px]"
                      : "border border-[#F0F0F0] hover:border-[#E0E0E0] rounded-[24px]"
                  )}
                  style={{
                    transform: isSelected ? "scale(1)" : "scale(0.998)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {/* Expandable map wrapper - smoother, calmer animation with staggered opacity */}
                  <div
                    className={cn(
                      "overflow-hidden relative",
                      isSelected 
                        ? "max-h-[272px] duration-400" 
                        : "max-h-0 duration-350"
                    )}
                    style={{
                      transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {/* Map container with inset frame styling - matches trust carousel */}
                    <div
                      className="w-full px-[6px] pt-[6px]"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transition: isSelected
                          ? "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s" // Fade in 50ms after expansion starts
                          : "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)", // Fade out immediately when collapsing
                      }}
                    >
                      <div className="relative w-full h-[260px] rounded-[18px] border border-[#F0F0F0] overflow-hidden bg-slate-50 shadow-none">
                        <CustomerMapViewport selectedAddress={addr} />
                        
                        {/* Edit button - top right corner of map, only for selected addresses */}
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddress(addr);
                            }}
                            className="absolute top-3 right-3 z-10 flex items-center justify-center w-10 h-10 rounded-md bg-black hover:bg-black/90 active:bg-black/80 transition-colors touch-manipulation"
                            style={{
                              top: '12px',
                              right: '12px',
                            }}
                            aria-label="Edit address"
                          >
                            <Pencil className="h-4 w-4 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content area - clickable to select/expand */}
                  <button
                    type="button"
                    onClick={() => handleAddressSelect(addr)}
                    className={cn(
                      "group w-full px-4 py-3 text-left flex items-center gap-3 bg-white",
                      "transition-colors duration-200 ease-in-out",
                      isSelected && "bg-white"
                    )}
                  >
                    {/* Icon from address */}
                    {(() => {
                      const IconComponent = getIconByName(addr.icon || 'Home');
                      return (
                        <IconComponent className="h-5 w-5 text-slate-900 flex-shrink-0" />
                      );
                    })()}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {getAddressPrimaryLine(addr)}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 truncate">
                        {getAddressSecondaryLine(addr)}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {addr.delivery_notes || "No Note Added"}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

        return (
          <>
            <CustomerScreen
              flowHeader={flowHeader}
              fixedContent={addressFixedContent}
              topContent={addressScrollableContent}
              customBottomPadding="calc(24px + max(24px, env(safe-area-inset-bottom)) + 132px)"
            >
              {/* No children – everything is in topContent */}
            </CustomerScreen>

        {/* Add Address Modal - Portal to document.body */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showAddAddressModal && (
              <>
                {/* Backdrop - covers everything including header */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                  onClick={handleCloseAddAddressModal}
                />
                
                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[90] flex flex-col pointer-events-none"
                >
                  {/* Modal Content - Starts higher up, fills to bottom */}
                  <motion.div
                    layout
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={iosSpring}
                    className="relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto"
                    style={{
                      marginTop: '15vh', // Start 15% from top (more space for modal)
                      height: 'calc(100vh - 15vh)', // Fill remaining space
                      maxHeight: 'calc(100vh - 15vh)'
                    }}
                  >
                    {/* Header - Fixed to top of modal */}
                    <motion.div
                      layout
                      className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-2xl z-10"
                    >
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">
                          Add Delivery Address
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          You can edit or remove it anytime.
                        </p>
                      </div>
                      <IconButton
                        type="button"
                        onClick={handleCloseAddAddressModal}
                        variant="default"
                        size="lg"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5 text-slate-900" />
                      </IconButton>
                    </motion.div>
                    
                    {/* Scrollable Content Area - between header and footer */}
                    <motion.div
                      layout
                      className="flex-1 min-h-0 overflow-y-auto"
                      style={{ 
                        paddingBottom: '120px' // Space for fixed footer
                      }}
                    >
                      <div className="px-6 py-6 space-y-6">
                        <AddressForm
                          ref={addAddressFormRef}
                          address={null}
                          onSave={handleSaveAddress}
                          onCancel={handleCloseAddAddressModal}
                        />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Footer - Fixed to bottom of screen with safe area */}
                  <motion.div
                    layout
                    className="fixed bottom-0 left-0 right-0 flex justify-center flex-shrink-0 border-t border-gray-200 bg-white z-10 pointer-events-auto"
                  >
                    <div className="w-full max-w-2xl px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={handleCloseAddAddressModal}
                          disabled={addAddressLoading}
                          variant="outline"
                          className="flex-1 h-14"
                        >
                          {addAddressCopy.cancelButton}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveAddAddress}
                          disabled={addAddressLoading}
                          className="flex-[2] h-14 bg-black text-white hover:bg-black/90"
                        >
                          {addAddressLoading ? "Saving..." : addAddressCopy.saveButton}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Edit Address Modal - Portal to document.body */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showEditAddressModal && editingAddress && (
              <>
                {/* Backdrop - covers everything including header */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                  onClick={handleCloseEditAddressModal}
                />
                
                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[90] flex flex-col pointer-events-none"
                >
                  {/* Modal Content - Starts higher up, fills to bottom */}
                  <motion.div
                    layout
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={iosSpring}
                    className="relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto"
                    style={{
                      marginTop: '15vh', // Start 15% from top (more space for modal)
                      height: 'calc(100vh - 15vh)', // Fill remaining space
                      maxHeight: 'calc(100vh - 15vh)'
                    }}
                  >
                    {/* Header - Fixed to top of modal */}
                    <motion.div
                      layout
                      className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-2xl z-10"
                    >
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">
                          Edit Delivery Address
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Update your address details.
                        </p>
                      </div>
                      <IconButton
                        type="button"
                        onClick={handleCloseEditAddressModal}
                        variant="default"
                        size="lg"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5 text-slate-900" />
                      </IconButton>
                    </motion.div>
                    
                    {/* Scrollable Content Area - between header and footer */}
                    <motion.div
                      layout
                      className="flex-1 min-h-0 overflow-y-auto"
                      style={{ 
                        paddingBottom: '120px' // Space for fixed footer
                      }}
                    >
                      <div className="px-6 py-6 space-y-6">
                        <AddressForm
                          ref={editAddressFormRef}
                          address={editingAddress}
                          onSave={handleSaveEditAddress}
                          onCancel={handleCloseEditAddressModal}
                        />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Footer - Fixed to bottom of screen with safe area */}
                  <motion.div
                    layout
                    className="fixed bottom-0 left-0 right-0 flex justify-center flex-shrink-0 border-t border-gray-200 bg-white z-10 pointer-events-auto"
                  >
                    <div className="w-full max-w-2xl px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={handleCloseEditAddressModal}
                          disabled={editAddressLoading}
                          variant="outline"
                          className="flex-1 h-14"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveEditAddressForm}
                          disabled={editAddressLoading}
                          className="flex-[2] h-14 bg-black text-white hover:bg-black/90"
                        >
                          {editAddressLoading ? "Saving..." : "Save Address"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </>
    );
  }

  // Step 2: Cash Amount + Bank Selection
  // Step 3: Delivery Style + OTP Education + Slide to Confirm

  if (step === 2 || step === 3) {
    return (
      <>
        <CustomerScreen
          flowHeader={flowHeader}
          fixedContent={step === 2 ? cashAmountFixedContent : step === 3 ? deliveryStyleFixedContent : null}
          topContent={topContent}
          customBottomPadding={step === 3 ? "calc(24px + max(24px, env(safe-area-inset-bottom)) + 200px)" : "calc(24px + max(24px, env(safe-area-inset-bottom)) + 120px)"}
        />

      {/* Add Address Modal - Portal to document.body */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddAddressModal && (
            <>
              {/* Backdrop - covers everything including header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                onClick={handleCloseAddAddressModal}
              />
              
              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex flex-col pointer-events-none"
              >
                {/* Modal Content - Starts higher up, fills to bottom */}
                <motion.div
                  layout
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={iosSpring}
                  className="relative w-full max-w-2xl mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto"
                  style={{
                    marginTop: '15vh', // Start 15% from top (more space for modal)
                    height: 'calc(100vh - 15vh)', // Fill remaining space
                    maxHeight: 'calc(100vh - 15vh)'
                  }}
                >
                  {/* Header - Fixed to top of modal */}
                  <motion.div
                    layout
                    className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-3xl z-10"
                  >
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">
                        Add Delivery Address
                      </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        You can edit or remove it anytime.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseAddAddressModal}
                      className="ml-4 text-gray-500 hover:text-gray-700 rounded-full p-2 transition-colors touch-manipulation"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </motion.div>
                  
                  {/* Scrollable Content Area - between header and footer */}
                  <motion.div
                    layout
                    className="flex-1 min-h-0 overflow-y-auto"
                    style={{ 
                      paddingBottom: '120px' // Space for fixed footer
                    }}
                  >
                    <div className="px-6 py-6 space-y-6">
                      <AddressForm
                        ref={addAddressFormRef}
                        address={null}
                        onSave={handleSaveAddress}
                        onCancel={handleCloseAddAddressModal}
                      />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Footer - Fixed to bottom of screen with safe area */}
                <motion.div
                  layout
                  className="fixed bottom-0 left-0 right-0 flex justify-center flex-shrink-0 border-t border-gray-200 bg-white z-10 pointer-events-auto"
                >
                  <div className="w-full max-w-2xl px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={handleCloseAddAddressModal}
                        disabled={addAddressLoading}
                        variant="outline"
                        className="flex-1 h-14"
                      >
                        {addAddressCopy.cancelButton}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveAddAddress}
                        disabled={addAddressLoading}
                        className="flex-[2] h-14 bg-black text-white hover:bg-black/90"
                      >
                        {addAddressLoading ? "Saving..." : addAddressCopy.saveButton}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delivery Style Help Stories (Step 3) */}
      <BankingHelpStories
        isOpen={showHelpStories}
        onClose={() => setShowHelpStories(false)}
        pages={deliveryStyleHelpPages}
        closeButtonPosition={helpButtonPosition}
      />

      </>
    );
  }

  // Step 1 is handled above, Steps 2 and 3 are handled above
  return null;
}



