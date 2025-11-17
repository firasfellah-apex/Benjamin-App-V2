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
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "@/lib/icons";
import { toast } from "sonner";
import { createOrder, formatAddress } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";
import { strings } from "@/lib/strings";
import { AddressSelector } from "@/components/address/AddressSelector";
import type { CustomerAddress } from "@/types/types";
import { calculatePricing } from "@/lib/pricing";
import CashAmountInput from "@/components/customer/CashAmountInput";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { CustomerMapViewport } from "@/components/customer/layout/CustomerMapViewport";
import { CustomerOrderFlowFooter } from "@/components/customer/layout/CustomerOrderFlowFooter";
import { useLocation } from "@/contexts/LocationContext";
import { MapPin, Plus } from "@/lib/icons";
import { track } from "@/lib/analytics";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useTopShelfTransition } from "@/features/shelf/useTopShelfTransition";
import { useCustomerAddresses } from "@/features/address/hooks/useCustomerAddresses";
import { useCustomerBottomSlot } from "@/contexts/CustomerBottomSlotContext";
import { DeliveryModeSelector, type DeliveryMode } from "@/components/customer/DeliveryModeSelector";

type Step = 1 | 2;

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [searchParams] = useSearchParams();
  const { location: liveLocation } = useLocation();
  
  // Constants
  const MIN_AMOUNT = 100;
  const MAX_AMOUNT = 1000;

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [amount, setAmount] = useState(300);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("count_confirm");
  const [loading, setLoading] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false); // Collapsed by default
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [draftAmountStr, setDraftAmountStr] = useState<string>("");
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Map center is now computed inside CustomerMapViewport using computeCustomerMapCenter

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
    setSelectedAddress(address);
  };

  const shelf = useTopShelfTransition({ currentStep: step });
  const { addresses, hasAnyAddress } = useCustomerAddresses();
  const { setBottomSlot } = useCustomerBottomSlot();
  
  // Use ref to store latest shelf to avoid recreating handlers when shelf changes
  const shelfRef = useRef(shelf);
  useEffect(() => {
    shelfRef.current = shelf;
  }, [shelf]);
  
  // Clean logic using cached hasAnyAddress:
  // - If user has 0 addresses (from cache), button is always disabled
  // - If user has >=1 addresses (from cache), enable button immediately (bypass selectedAddress check)
  //   Auto-selection will set selectedAddress, but we trust the cache to prevent flicker
  //   We still validate selectedAddress in handleNextStep to prevent edge cases
  const isContinueDisabled = !hasAnyAddress;
  
  const handleNextStep = useCallback(() => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }
    // Prepare transition, then update step
    shelfRef.current.prepare('amount', 420);
    // Update step after reserve phase starts
    setTimeout(() => {
      setStep(2);
    }, 140);
  }, [selectedAddress]);
  
  const handleBackToAddress = useCallback(() => {
    shelfRef.current.prepare('address', 320);
    // Update step after reserve phase starts
    setTimeout(() => {
      setStep(1);
    }, 140);
  }, []);
  
  const handleBackToHome = useCallback(() => {
    shelfRef.current.goTo('/customer/home', 'home', 320);
  }, []);

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
      
      const order = await createOrder(
        amount,
        formatAddress(selectedAddress),
        deliveryNotes,
        selectedAddress.id
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

  // Memoize the summary section (everything except breakdown) - stable reference
  // MUST be before any conditional returns to follow Rules of Hooks
  const summarySection = useMemo(() => {
    return (
      <div className="w-full space-y-4">
        <div className="w-full flex justify-between items-center">
          <span className="text-base font-medium text-gray-900">You'll get</span>
          <span 
            className="text-lg font-bold text-gray-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            ${amount.toFixed(0)}
          </span>
        </div>
        <div className="w-full flex justify-between items-center">
          <span className="text-base font-medium text-gray-900">You'll pay</span>
          <span 
            className="text-lg font-bold text-gray-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            ${pricing?.total.toFixed(2) || '0.00'}
          </span>
        </div>
        
        {/* View breakdown link/expander */}
        {/* Element fills container and sizes by content */}
        <button
          onClick={() => {
            const newState = !showFeeDetails;
            setShowFeeDetails(newState);
            track('fee_breakdown_toggled', {
              is_expanded: newState,
            });
          }}
          className="w-full flex items-center justify-between transition-opacity pt-4 border-t border-gray-200"
        >
          <span className="text-sm font-medium text-gray-600">View breakdown</span>
          {showFeeDetails ? (
            <ChevronUp className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Fee Breakdown - iOS-style expand/collapse */}
        <AnimatePresence initial={false}>
          {pricing && showFeeDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.5,
              }}
              style={{ overflow: "hidden" }}
            >
              <div className="space-y-2" style={{ paddingTop: "12px" }}>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Cash amount</span>
                  <span className="text-gray-900 font-medium">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="text-gray-900 font-medium">${pricing.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Compliance fee</span>
                  <span className="text-gray-900 font-medium">${pricing.complianceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="text-gray-900 font-medium">${pricing.deliveryFee.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }, [pricing, amount, showFeeDetails]);

  // Memoize the entire topContent to prevent remounting
  // MUST be before any conditional returns to follow Rules of Hooks
  // Standardized spacing: space-y-4 (16px) for main content blocks
  const topContent = useMemo(() => {
    return (
    <div className="space-y-4 pb-[180px]" style={{ minHeight: "180px" }}>
      {/* Cash Amount Section */}

      {/* Main Amount Display */}
      {/* Element fills container and sizes by content */}
      {/* Reserve space with minHeight to prevent layout shift */}
      <div className="w-full flex items-center justify-center" style={{ minHeight: '60px' }}>
        {!isEditingAmount ? (
          <div 
            onClick={() => {
              setIsEditingAmount(true);
              setDraftAmountStr(String(amount)); // seed with current value
              setTimeout(() => amountInputRef.current?.focus(), 0);
            }}
            className="cursor-text"
            style={{ 
              fontSize: 48, 
              fontWeight: 700, 
              color: '#0F172A',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            ${amount.toLocaleString()}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <input
              ref={amountInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draftAmountStr}
              onChange={(e) => {
                // allow free typing of digits; strip commas/spaces
                const raw = e.target.value.replace(/[^\d]/g, "");
                // optional: cap length to something sane (e.g., 5 digits)
                setDraftAmountStr(raw);
              }}
              onBlur={() => {
                // commit on blur: parse, clamp, step-round, then exit edit mode
                const num = parseInt(draftAmountStr || "0", 10);
                // if empty or 0, fall back to MIN so we never commit NaN
                const safe = Number.isFinite(num) && num > 0 ? num : MIN_AMOUNT;
                // round to nearest $20 and clamp to [MIN, MAX]
                const rounded = Math.round(safe / 20) * 20;
                const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, rounded));
                setAmount(clamped);
                setIsEditingAmount(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur(); // triggers the same commit logic
                } else if (e.key === "Escape") {
                  // cancel edits and revert
                  setDraftAmountStr(String(amount));
                  setIsEditingAmount(false);
                }
              }}
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#0F172A',
                textAlign: 'center',
                width: '200px',
                border: 'none',
                borderBottom: '2px solid #000',
                background: 'transparent',
                outline: 'none',
                paddingBottom: '4px'
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Range Helper Text */}
      {/* Element fills container and sizes by content */}
      <div className="w-full text-center">
        <p className="text-sm text-gray-600">
          ${MIN_AMOUNT.toLocaleString()}–${MAX_AMOUNT.toLocaleString()} range
        </p>
      </div>

      {/* Amount Selection Components (Preset Buttons & Slider) */}
      {/* Element fills container and sizes by content */}
      <div className="w-full">
        <CashAmountInput
          value={amount}
          onChange={handleAmountChange}
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={20}
          hideAmountDisplay={true}
          hideRangeText={true}
        />
      </div>

      {/* Summary Section */}
      {/* Element fills container and sizes by content */}
      <div className="w-full">
        {summarySection}
      </div>

      {/* Delivery Style Selector */}
      {/* Element fills container and sizes by content */}
      <div className="w-full pt-6">
        <div className="mb-4">
          <h2 className="text-[22px] sm:text-[24px] font-semibold leading-tight tracking-tight text-slate-900">
            How should we deliver?
          </h2>
          <p className="text-[16px] sm:text-[17px] text-slate-500 leading-snug mt-0.5">
            Choose what matters most this time.
          </p>
        </div>

        <DeliveryModeSelector
          value={deliveryMode}
          onChange={(mode) => setDeliveryMode(mode)}
        />
      </div>
    </div>
  );
  }, [amount, isEditingAmount, handleAmountChange, summarySection, draftAmountStr, pricing, deliveryMode]);

  // Memoize terms content for footer
  const termsContent = useMemo(() => {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
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
      if (!isEditingAddress) {
        return (
          <CustomerOrderFlowFooter
            mode="address"
            onPrimary={handleNextStep}
            onSecondary={handleBackToHome}
            isLoading={false}
            primaryDisabled={isContinueDisabled}
          />
        );
      } else {
        return null;
      }
    } else if (step === 2) {
      return (
        <CustomerOrderFlowFooter
          mode="amount"
          onPrimary={handleSubmit}
          onSecondary={handleBackToAddress}
          isLoading={loading}
          primaryDisabled={loading || !selectedAddress || !pricing || !deliveryMode}
          termsContent={termsContent}
        />
      );
    }
    return null;
  }, [step, isEditingAddress, handleNextStep, handleBackToHome, handleBackToAddress, handleSubmit, loading, selectedAddress, pricing, isContinueDisabled, deliveryMode, termsContent]);

  // Set bottom slot - only depends on memoized footer and stable setBottomSlot
  useEffect(() => {
    setBottomSlot(footer);
    return () => setBottomSlot(null);
  }, [setBottomSlot, footer]);

  // Step 1: Address Selection
  if (step === 1) {
    // Top content: zero-address state OR address selector + add button
    const addressTopContent = addresses.length === 0 ? (
      <div className="space-y-4">

        <div className="w-full flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F4F7FB] flex items-center justify-center">
            <MapPin className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 text-center">
            No Address Yet
          </h3>
          <p className="text-sm text-slate-500 text-center">
            Let's add your first address.
          </p>
          <button
            type="button"
            onClick={() => setShowAddAddressForm(true)}
            className="w-full rounded-full bg-black text-white text-base font-semibold active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 py-4 px-6"
          >
            <Plus className="w-5 h-5" />
            Add Your First Address
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-4">

        <AddressSelector
          selectedAddressId={selectedAddress?.id || searchParams.get('address_id') || null}
          onAddressSelect={handleAddressSelect}
          onAddressChange={() => {}}
          onEditingChange={setIsEditingAddress}
          onAddressesCountChange={() => {}}
          hideManageButton={true}
          triggerAddAddress={showAddAddressForm}
          onAddAddressTriggered={() => setShowAddAddressForm(false)}
        />
        {/* Add Address button - only show when user has 1+ addresses */}
        {hasAnyAddress && (
          <button
            onClick={() => {
              setShowAddAddressForm(true);
            }}
            className="w-full rounded-full border border-slate-200 bg-white py-4 px-6 text-base font-semibold text-slate-900 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] active:bg-slate-50 transition-transform duration-150"
          >
            <Plus className="w-5 h-5" />
            Add Address
          </button>
        )}
      </div>
    );

    return (
      <CustomerScreen
        loading={false}
        stepKey="address"
        title="Where should we deliver?"
        subtitle="Select a location. You can save more than one."
        topContent={addressTopContent}
        map={<CustomerMapViewport selectedAddress={selectedAddress} />}
      >
        {/* No children - everything is in topContent */}
      </CustomerScreen>
    );
  }

  // Step 2: Cash Amount + Delivery Style
  const isLoading = loading || !pricing;

  return (
    <CustomerScreen
      loading={isLoading}
      stepKey="amount"
      title="How much cash do you need?"
      subtitle="Choose an amount and delivery style."
      topContent={topContent}
    >
      {/* No children - everything is in topContent */}
    </CustomerScreen>
  );
}



