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
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowCard } from "@/components/customer/FlowCard";
import { FlowHeader } from "@/components/customer/FlowHeader";
import { toast } from "sonner";
import { createOrder, formatAddress } from "@/db/api";
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
  const [searchParams] = useSearchParams();
  
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
    // Haptic feedback on mobile devices when selecting/expanding a card
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Light haptic feedback (10ms vibration)
      navigator.vibrate(10);
    }
    
    setSelectedAddress(address);
  };

  const { addresses, hasAnyAddress } = useCustomerAddresses();
  const { setBottomSlot } = useCustomerBottomSlot();
  const invalidateAddresses = useInvalidateAddresses();

  // Modal state for adding address
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const addAddressFormRef = useRef<AddressFormRef>(null);
  const [addAddressLoading, setAddAddressLoading] = useState(false);

  // Auto-select first address when addresses load
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  // Handlers for address management
  const handleManageAddresses = useCallback(() => {
    navigate("/customer/addresses");
  }, [navigate]);

  const handleAddAddress = useCallback(() => {
    setShowAddAddressModal(true);
    track('add_address_clicked', { source: 'cash_request_step_1' });
  }, []);

  const handleSaveAddress = useCallback((address: CustomerAddress) => {
    setAddAddressLoading(false);
    setShowAddAddressModal(false);
    invalidateAddresses();
    // Select the newly created address
    setSelectedAddress(address);
    track('address_created', { source: 'cash_request_step_1' });
  }, [invalidateAddresses]);

  const handleCloseAddAddressModal = useCallback(() => {
    setShowAddAddressModal(false);
  }, []);

  const handleSaveAddAddress = useCallback(() => {
    if (addAddressFormRef.current) {
      addAddressFormRef.current.submit();
    }
  }, []);

  // Sync loading state from form
  useEffect(() => {
    if (addAddressFormRef.current && showAddAddressModal) {
      addAddressFormRef.current.setLoadingCallback(setAddAddressLoading);
    }
  }, [showAddAddressModal]);
  
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
    // Save the current carousel index before moving to next step
    // This will be restored when returning to address selection
    // Note: The index is saved via onCarouselIndexChange callback
    setStep(2);
  }, [selectedAddress]);
  
  const handleBackToAddress = useCallback(() => {
    setStep(1);
  }, []);
  
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

  // Memoize the summary section (everything including breakdown) - stable reference
  // MUST be before any conditional returns to follow Rules of Hooks
  const summarySection = useMemo(() => {
    return (
      <div className="w-full mt-6">
        {/* Summary Card with Light Green Gradient Background - Entirely clickable */}
        <button
          type="button"
          onClick={() => {
            const newState = !showFeeDetails;
            setShowFeeDetails(newState);
            track('fee_breakdown_toggled', {
              is_expanded: newState,
            });
          }}
          className="w-full text-left bg-gradient-to-b from-[#ECFDF3] to-[#DCFCE7] rounded-xl cursor-pointer active:opacity-95 transition-opacity"
          style={{ padding: '18px' }}
        >
          {/* Top Row - You'll Get */}
          <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
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

          {/* Expanding Divider - 2px white line when collapsed, expands to show breakdown */}
          <div 
            className="overflow-hidden"
            style={{
              marginBottom: '12px',
            }}
          >
            {/* 2px white divider line - only visible when collapsed */}
            {!showFeeDetails && (
              <div
                style={{
                  marginLeft: '-16px',
                  marginRight: '-16px',
                  height: '2px',
                  backgroundColor: 'white',
                  borderRadius: '3px',
                }}
              />
            )}
            
            {/* Expandable container for breakdown content */}
            <div
              className="overflow-hidden"
              style={{
                // ❗ geometry fix:
                // green card has padding: 18px
                // pull the content out by 16px on each side
                // so its edges sit 2px from the green card edge
                marginLeft: '-16px',
                marginRight: '-16px',
                borderRadius: '3px',
                backgroundColor: 'transparent', // Always transparent - no white background
                minHeight: showFeeDetails ? 'auto' : '0',
                maxHeight: showFeeDetails ? '220px' : '0',
                transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box',
              }}
            >
              {/* Breakdown content - fades in when expanded */}
              {pricing && (
                <div 
                  style={{
                    borderRadius: '3px',
                    // padding math:
                    // green edge → content edge: 2px
                    // content edge → text: 16px
                    // 2 + 16 = 18 → text lines up with "You'll Get / You'll Pay"
                    padding: showFeeDetails ? '12px 16px' : '0',
                    backgroundColor: 'transparent',
                    opacity: showFeeDetails ? 1 : 0,
                    transition: showFeeDetails
                      ? 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.15s'
                      : 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: showFeeDetails ? 'auto' : 'none',
                    boxSizing: 'border-box',
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
        />
      );
    }
  }, [step, handleBackToHome, handleBackToAddress]);

  // Memoize the entire topContent to prevent remounting
  // MUST be before any conditional returns to follow Rules of Hooks
  // Premium spacing: 24px padding overall, clear vertical sections
  const topContent = useMemo(() => {
    return (
    <div className="space-y-6" style={{ minHeight: "180px" }}>
      {/* Cash Amount Section */}
      <FlowCard className="space-y-6">
        {/* Amount Selection Components (Amount Display, Preset Buttons & Slider) */}
        <CashAmountInput
          value={amount}
          onChange={handleAmountChange}
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={20}
          hideAmountDisplay={false}
        />

        {/* Summary Section */}
        {summarySection}
      </FlowCard>

      {/* Delivery Style Selector */}
      <FlowCard className="space-y-4">
        <DeliveryModeSelector
          value={deliveryMode}
          onChange={(mode) => setDeliveryMode(mode)}
        />
      </FlowCard>
    </div>
  );
  }, [amount, handleAmountChange, summarySection, pricing, deliveryMode]);

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
    const addressFixedContent = addresses.length > 0 ? (
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase pb-1.5">
        Saved locations
      </p>
    ) : null;

    // Scrollable content: expandable address cards (title is fixed above)
    const addressScrollableContent = (
      <div className="space-y-4 pb-6">
        {/* 0 addresses – empty state */}
        {addresses.length === 0 && (
          <div className="w-full rounded-xl border border-dashed border-[#F0F0F0] bg-slate-50/60 px-4 py-6 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg">
              +
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Add your first address
              </p>
              <p className="text-sm text-slate-500">
                Save a place where you'd like cash delivered. You can add more later.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAddress}
              className="mt-1 w-full rounded-full bg-slate-900 text-white text-sm font-semibold py-3 px-4 active:scale-[0.98] transition-transform duration-150"
            >
              Add Address
            </button>
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
                      ? "border-2 border-black shadow-sm"
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
                      "overflow-hidden",
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
                      className="w-full h-[200px] bg-slate-50"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transition: isSelected
                          ? "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.05s" // Fade in 50ms after expansion starts
                          : "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)", // Fade out immediately when collapsing
                      }}
                    >
                      <CustomerMapViewport selectedAddress={addr} />
                    </div>
                  </div>

                  {/* Content area - clickable to select/expand */}
                  <button
                    type="button"
                    onClick={() => handleAddressSelect(addr)}
                    className={cn(
                      "group w-full px-4 py-3 text-left flex items-center justify-between gap-3 bg-white",
                      "transition-colors duration-200 ease-in-out",
                      isSelected && "bg-white"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {addr.label || "Saved address"}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 truncate">
                        {formatAddress(addr)}
                      </p>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageAddresses();
                      }}
                      className="ml-2 flex items-center justify-center shrink-0 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
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
                        <button
                          type="button"
                          onClick={handleCloseAddAddressModal}
                          disabled={addAddressLoading}
                          className={cn(
                            "flex-1 rounded-full py-4 px-6",
                            "border border-gray-300",
                            "bg-white text-gray-900",
                            "text-base font-semibold",
                            "flex items-center justify-center",
                            "transition-all duration-200",
                            "active:scale-[0.97]",
                            "touch-manipulation",
                            addAddressLoading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {addAddressCopy.cancelButton}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAddAddress}
                          disabled={addAddressLoading}
                          className={cn(
                            "flex-[2] rounded-full py-4 px-6",
                            "bg-black text-white",
                            "text-base font-semibold",
                            "flex items-center justify-center",
                            "transition-all duration-200",
                            "active:scale-[0.97]",
                            "touch-manipulation",
                            addAddressLoading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {addAddressLoading ? "Saving..." : addAddressCopy.saveButton}
                        </button>
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
                      <button
                        type="button"
                        onClick={handleCloseAddAddressModal}
                        disabled={addAddressLoading}
                        className={cn(
                          "flex-1 rounded-full py-4 px-6",
                          "border border-gray-300",
                          "bg-white text-gray-900",
                          "text-base font-semibold",
                          "flex items-center justify-center",
                          "transition-all duration-200",
                          "active:scale-[0.97]",
                          "touch-manipulation",
                          addAddressLoading && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {addAddressCopy.cancelButton}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAddAddress}
                        disabled={addAddressLoading}
                        className={cn(
                          "flex-[2] rounded-full py-4 px-6",
                          "bg-black text-white",
                          "text-base font-semibold",
                          "flex items-center justify-center",
                          "transition-all duration-200",
                          "active:scale-[0.97]",
                          "touch-manipulation",
                          addAddressLoading && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {addAddressLoading ? "Saving..." : addAddressCopy.saveButton}
                      </button>
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



