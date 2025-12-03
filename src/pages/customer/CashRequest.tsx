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
import { ChevronDown, X } from "@/lib/icons";
import { Landmark, MapPin } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Pencil, Shield } from "lucide-react";
import { getIconByName } from "@/components/address/IconPicker";
import { cn } from "@/lib/utils";
import { FlowHeader } from "@/components/customer/FlowHeader";
import { toast } from "sonner";
import { createOrder, formatAddress, getAddressPrimaryLine, getAddressSecondaryLine } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";
import { strings } from "@/lib/strings";
import type { CustomerAddress } from "@/types/types";
import { calculatePricing } from "@/lib/pricing";
import CashAmountInput from "@/components/customer/CashAmountInput";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { CustomerMapViewport } from "@/components/customer/layout/CustomerMapViewport";
import { CustomerOrderFlowFooter } from "@/components/customer/layout/CustomerOrderFlowFooter";
import { track } from "@/lib/analytics";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useCustomerAddresses, useInvalidateAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { DeliveryModeSelector, type DeliveryMode } from "@/components/customer/DeliveryModeSelector";
import { AddressForm, type AddressFormRef } from "@/components/address/AddressForm";
import { addAddressCopy } from "@/lib/copy/addAddress";

type Step = 1 | 2;

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Constants
  const MIN_AMOUNT = 100;
  const MAX_AMOUNT = 1000;

  // Wizard state
  // Initialize step from URL param if present (for navigation back from ManageAddresses)
  const stepParam = searchParams.get('step');
  const initialStep = stepParam === '2' ? 2 : 1;
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

  // Initialize amount and delivery mode from profile personalization (only once on mount)
  useEffect(() => {
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
    if (stepParam === '1' || stepParam === '2') {
      const urlStep = stepParam === '2' ? 2 : 1;
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

  // Sync selectedAddressId with URL param to persist across navigation
  const selectedAddressIdFromUrl = searchParams.get('address_id');

  // Update URL when selectedAddress changes (but don't navigate)
  useEffect(() => {
    if (step === 1 && selectedAddress) {
      if (selectedAddressIdFromUrl !== selectedAddress.id) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('address_id', selectedAddress.id);
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [selectedAddress?.id, step, selectedAddressIdFromUrl, searchParams, setSearchParams]);

  // Handle reorder prefilling from URL params
  useEffect(() => {
    const amountParam = searchParams.get('amount');
    if (amountParam) {
      const parsedAmount = parseFloat(amountParam);
      if (!isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT) {
        // Round to nearest $20 increment
        const rounded = Math.round(parsedAmount / 20) * 20;
        const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, rounded));
        setAmount(clamped);
        if (step === 1) {
          setTimeout(() => {
            const addressIdParam = searchParams.get('address_id');
            if (addressIdParam) {
              setStep(2);
            }
          }, 500);
        }
      }
    }
  }, [searchParams, step]);

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
  useEffect(() => {
    // No addresses at all → clear selection
    if (addresses.length === 0) {
      if (selectedAddress) setSelectedAddress(null);
      return;
    }

    // Check if current selection is valid (exists in addresses array)
    const hasValidSelection = selectedAddress && addresses.some(a => a.id === selectedAddress.id);

    // Priority 1: Restore from URL param if it exists and we don't have a valid selection
    // This handles:
    // 1. Returning from Manage Addresses (component remounts, selectedAddress is null, URL param preserved)
    // 2. Returning from Cash Amount (step changes, selectedAddress might be stale, URL param preserved)
    // 3. Returning from Bank Accounts on step 2 (selectedAddress might be lost, URL param preserved)
    if (selectedAddressIdFromUrl && !hasValidSelection) {
      const restored = addresses.find(a => a.id === selectedAddressIdFromUrl);
      if (restored && (!selectedAddress || selectedAddress.id !== restored.id)) {
        setSelectedAddress(restored);
        return;
      }
    }

    // Priority 2: If we have a valid selection, don't override it (preserve manual selections)
    // This includes newly created addresses that were just selected via handleSaveAddress
    if (hasValidSelection) {
      return;
    }

    // Priority 3: Only auto-select first address on step 1 (not step 2)
    // Step 2 should only be accessible after selecting an address, so we shouldn't auto-select here
    // This only runs when there's NO selection at all (initial load)
    if (step === 1 && !selectedAddress) {
      const firstAddress = addresses[0];
      if (firstAddress) {
        setSelectedAddress(firstAddress);
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
  }, [selectedAddress, searchParams, setSearchParams]);
  
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
  
  const handleBackToHome = useCallback(() => {
    // Reset selected address when going back to home (starting a new request)
    setSelectedAddress(null);
    navigate('/customer/home');
  }, [navigate]);

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
      
      // Map deliveryMode to delivery_style
      const deliveryStyle = deliveryMode === 'count_confirm' ? 'COUNTED' as const : 'SPEED' as const;
      
      // Debug logging for delivery style mapping
      console.log('[CashRequest] Creating order with delivery style:', {
        deliveryMode,
        deliveryStyle,
        mapping: deliveryMode === 'count_confirm' ? 'count_confirm → COUNTED' : 'quick_handoff → SPEED',
      });
      
      const order = await createOrder(
        amount,
        formatAddress(selectedAddress),
        deliveryNotes,
        selectedAddress.id,
        deliveryStyle
      );
      if (order) {
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
  }, [selectedAddress, pricing, profile, amount, deliveryMode, navigate]);

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
              ${amount.toFixed(0)}
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
                        ${pricing.platformFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm" style={{ marginBottom: '8px' }}>
                      <span className="text-slate-600">Compliance Fee</span>
                      <span className="text-slate-900 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        ${pricing.complianceFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Runner Fee</span>
                      <span className="text-slate-900 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                        ${pricing.deliveryFee.toFixed(2)}
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
              ${pricing?.total.toFixed(2) || '0.00'}
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

  // Handle navigate to manage addresses - pass return path with address_id preserved
  // Don't include step=1 since it's the default - just include address_id (matches home -> select address flow)
  const handleManageAddressesFromSelect = useCallback(() => {
    // Build return path with address_id only (step defaults to 1)
    if (selectedAddress?.id) {
      const returnPath = encodeURIComponent(`/customer/request?address_id=${selectedAddress.id}`);
      navigate(`/customer/addresses?return=${returnPath}`);
    } else {
      const returnPath = encodeURIComponent('/customer/request');
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

  // Memoize flow header for both steps
  const flowHeader = useMemo(() => {
    if (step === 1) {
      return (
        <FlowHeader
          step={1}
          totalSteps={2}
          mode="cancel"
          onPrimaryNavClick={handleBackToHome}
          title="Where should we deliver?"
          subtitle="Select a location. You can save more than one."
          onSecondaryAction={handleManageAddressesFromSelect}
          showSecondaryAction={true}
        />
      );
    } else {
      return (
        <FlowHeader
          step={2}
          totalSteps={2}
          mode="back"
          onPrimaryNavClick={handleBackToAddress}
          title="How much cash do you need?"
          subtitle="Choose an amount and delivery style."
          onSecondaryAction={handleBankAccounts}
          showSecondaryAction={true}
          secondaryActionIcon={Landmark}
          secondaryActionLabel="My Bank Accounts"
        />
      );
    }
  }, [step, handleBackToHome, handleBackToAddress, handleManageAddressesFromSelect, handleBankAccounts]);

  // Fixed content for step 2 (cash amount) - divider under title
  const cashAmountFixedContent = step === 2 ? (
    <>
      {/* Divider under title/subtitle - 24px spacing from subtitle (fixed, doesn't scroll) */}
      <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
    </>
  ) : null;

  // Memoize the entire topContent to prevent remounting
  // MUST be before any conditional returns to follow Rules of Hooks
  // Premium spacing: 24px padding overall, clear vertical sections
  const topContent = useMemo(() => {
    if (step === 2) {
      // Cash amount page - divider is now in fixedContent, so content starts here
      return (
        <div className="space-y-0" style={{ minHeight: "180px" }}>
          {/* 24px spacing from fixed divider to cash input */}
          <div style={{ paddingTop: '24px' }}>
            {/* Cash Amount Section - No wrapper container */}
            <CashAmountInput
              value={amount}
              onChange={handleAmountChange}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={20}
              hideAmountDisplay={false}
            />
          </div>

      {/* Summary Section - No wrapper container */}
      <div style={{ paddingTop: '24px' }}>
        {summarySection}
      </div>

      {/* Second divider - Only under the chevron (after summary section) */}
      <div style={{ paddingTop: '24px' }}>
        <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
      </div>

      {/* Delivery Style Selector - No wrapper container */}
      <div style={{ paddingTop: '24px' }}>
        <DeliveryModeSelector
          value={deliveryMode}
          onChange={(mode) => setDeliveryMode(mode)}
        />
      </div>

      {/* Third divider - Under the style toggle */}
      <div style={{ paddingTop: '24px' }}>
        <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
      </div>

      {/* Security Tip - Standalone, always fully open */}
      <div style={{ paddingTop: '24px' }}>
        <div className="w-full rounded-xl bg-[#FEF9C3]" style={{ padding: '18px' }}>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-900">
                Never Share Your Code Early
              </p>
            </div>
            <div className="h-[1px] bg-orange-500 mb-3 w-full" />
            <div className="space-y-1.5 text-sm text-slate-600">
              <p>Anyone with the code can receive your envelope.</p>
              <p>Only share it when your runner is with you.</p>
              <p>Benjamin will never ask for it by phone or text.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
      );
    }
    
    // Step 1 (address selection) - no topContent here, handled separately
    return null;
  }, [step, amount, handleAmountChange, summarySection, pricing, deliveryMode]);

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
      return (
        <CustomerOrderFlowFooter
          mode="amount"
          onPrimary={handleSubmit}
          onSecondary={handleBackToAddress}
          isLoading={loading}
          primaryDisabled={loading || !selectedAddress || !pricing || !deliveryMode}
          termsContent={termsContent}
          useSliderButton={true}
        />
      );
    }
    return null;
  }, [
    step,
    handleNextStep,
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
            
            // Expanded card height estimate: map (200px) + content (~48px) = 248px
            const expandedCardHeight = 248;
            
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
          <div className="w-full rounded-xl border border-dashed border-[#F0F0F0] bg-slate-50/60 px-4 py-6 flex flex-col items-center text-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Add Your First Address
              </p>
              <p className="text-sm text-slate-500">
                Save a place where you'd like cash delivered.
                <br />
                You can add more later.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAddAddress}
              className="w-full h-14"
            >
              Add Address
            </Button>
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
                    "w-full rounded-xl border bg-white overflow-hidden",
                    "transition-all duration-300 ease-in-out",
                    isSelected
                      ? "border border-black"
                      : "border border-[#F0F0F0] hover:border-[#E0E0E0]"
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
                        ? "max-h-[220px] duration-400" 
                        : "max-h-0 duration-350"
                    )}
                    style={{
                      transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {/* Map container with staggered opacity fade-in */}
                    <div
                      className="w-full h-[200px] bg-slate-50 relative"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transition: isSelected
                          ? "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s" // Fade in 50ms after expansion starts
                          : "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)", // Fade out immediately when collapsing
                      }}
                    >
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

  // Step 2: Cash Amount + Delivery Style

  return (
    <>
      <CustomerScreen
        flowHeader={flowHeader}
        fixedContent={cashAmountFixedContent}
        topContent={topContent}
        customBottomPadding="calc(24px + max(24px, env(safe-area-inset-bottom)) + 120px)"
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
    </>
  );
}



