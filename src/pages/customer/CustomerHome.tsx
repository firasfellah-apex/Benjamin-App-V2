/**
 * Customer Home - Request Builder
 * 
 * Single-page progressive request builder with:
 * 1. Address selection
 * 2. Cash amount selection
 * 3. Delivery style selection
 * 4. Mini-map summary card
 * 5. Bottom fixed CTA: "Request Cash"
 */

import { Navigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { CustomerMapViewport } from '@/components/customer/layout/CustomerMapViewport';
import { RequestFlowBottomBar } from '@/components/customer/RequestFlowBottomBar';
import CustomerHeaderBar from '@/components/customer/layout/CustomerHeaderBar';
import { AddressSelector } from '@/components/address/AddressSelector';
import CashAmountInput from '@/components/customer/CashAmountInput';
import { DeliveryModeSelector, type DeliveryMode } from '@/components/customer/DeliveryModeSelector';
import { MapSummaryOverlay } from '@/components/customer/MapSummaryOverlay';
import { useCustomerAddresses } from '@/features/address/hooks/useCustomerAddresses';
import { useCustomerBottomSlot } from '@/contexts/CustomerBottomSlotContext';
import type { CustomerAddress } from '@/types/types';
import { ChevronDown, ChevronUp, MapPin, Plus } from '@/lib/icons';
import { getIconByName } from '@/components/address/IconPicker';
import { Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createOrder, formatAddress } from '@/db/api';
import { calculatePricing } from '@/lib/pricing';
import { track } from '@/lib/analytics';

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 1000;

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const navigate = useNavigate();
  const { addresses, isLoading: addressesLoading } = useCustomerAddresses();
  const { setBottomSlot } = useCustomerBottomSlot();

  // Request builder state
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [mode, setMode] = useState<DeliveryMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [triggerAddAddress, setTriggerAddAddress] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  
  // Track which section is being edited (expanded)
  const [editingSection, setEditingSection] = useState<'address' | 'amount' | 'mode' | null>(null);

  // Auto-select first address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
    }
  }, [addresses, selectedAddress]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedAddress || amount === null) return null;
    return calculatePricing({
      amount,
      customerAddress: {
        lat: selectedAddress.latitude || 0,
        lng: selectedAddress.longitude || 0,
      },
    });
  }, [selectedAddress, amount]);

  // Handle address selection
  const handleAddressSelect = useCallback((address: CustomerAddress) => {
    setSelectedAddress(address);
    // Auto-collapse address section when selected (unless user is actively editing)
    if (editingSection !== 'address') {
      setEditingSection(null);
    }
  }, [editingSection]);

  // Handle amount change
  const handleAmountChange = useCallback((newAmount: number) => {
    setAmount(newAmount);
    track('cash_amount_changed', {
      amount: newAmount,
      amount_range: newAmount < 200 ? 'low' : newAmount < 500 ? 'medium' : 'high',
    });
    // Auto-collapse amount section when selected (unless user is actively editing)
    if (editingSection !== 'amount') {
      setEditingSection(null);
    }
  }, [editingSection]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: DeliveryMode) => {
    setMode(newMode);
    track('delivery_mode_selected', { mode: newMode });
    // Auto-collapse mode section when selected
    setEditingSection(null);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!selectedAddress || amount === null || !mode) {
      toast.error("Please complete all fields");
      return;
    }
    
    if (!pricing) {
      toast.error("Unable to calculate pricing");
      return;
    }

    if (profile && profile.daily_usage + pricing.total > profile.daily_limit) {
      toast.error(`Daily limit exceeded. Remaining: $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

    track('order_submitted', {
      amount: amount,
      total_cost: pricing.total,
      platform_fee: pricing.platformFee,
      compliance_fee: pricing.complianceFee,
      delivery_fee: pricing.deliveryFee,
      delivery_mode: mode,
      has_delivery_notes: !!selectedAddress.delivery_notes,
    });

    setIsSubmitting(true);
    try {
      const deliveryNotes = selectedAddress.delivery_notes || "";
      const order = await createOrder(
        amount,
        formatAddress(selectedAddress),
        deliveryNotes,
        selectedAddress.id
      );
      if (order) {
        toast.success("Order placed successfully!");
        navigate(`/customer/deliveries/${order.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error?.message || error?.error?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAddress, amount, mode, pricing, profile, navigate]);

  // Get user's display name
  const getUserName = (): string => {
    if (profile?.first_name) {
      const formatted = profile.first_name
        .split(" ")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
      if (formatted && /^[a-zA-Z]/.test(formatted)) return formatted;
    }
    return "";
  };

  const getGreetingTime = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    return "evening";
  };

  const displayName = getUserName();
  const greeting = useMemo(() => {
    if (!isReady) return "Good morning";
    return `Good ${getGreetingTime()}${displayName ? `, ${displayName}` : ""}`;
  }, [isReady, displayName]);

  // Progressive visibility logic
  const hasAddresses = addresses.length > 0;
  const showAmountSection = hasAddresses && selectedAddress !== null;
  const showModeSection = showAmountSection && amount !== null;
  const showMapCard = selectedAddress !== null; // Show map after address is selected
  const canSubmit = selectedAddress !== null && amount !== null && mode !== null;
  
  // Sections are collapsed (show summary) if they're completed and not being edited
  const showAddressSummary = selectedAddress !== null && editingSection !== 'address';
  const showAmountSummary = amount !== null && editingSection !== 'amount';
  const showModeSummary = mode !== null && editingSection !== 'mode';

  // Set bottom slot
  useEffect(() => {
    setBottomSlot(
      <RequestFlowBottomBar
        mode="home"
        onPrimary={handleSubmit}
        isLoading={isSubmitting}
        primaryDisabled={!canSubmit}
        primaryLabel="Request Cash"
        useFixedPosition={true}
      />
    );
    return () => setBottomSlot(null);
  }, [setBottomSlot, handleSubmit, isSubmitting, canSubmit]);

  // If no user, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const loading = authLoading || (user && !isReady) || addressesLoading;

  return (
    <MobilePageShell className="bg-[#F4F5F7]">
      {/* Header with logo and menu - pinned to top */}
      <CustomerHeaderBar />
      
      {/* Add top padding to account for fixed header height */}
      {/* Header height = safe-area-top + content (~48px) */}
      <div className="mx-auto flex w-full max-w-md flex-col pb-28" style={{ paddingTop: 'calc(max(44px, env(safe-area-inset-top)) + 48px)' }}>
        {/* Top greeting band */}
        <header className="px-4 pt-6 pb-5">
          {loading ? (
            <>
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-slate-900">{greeting}</h1>
              <p className="text-sm text-slate-500">Ready when you are.</p>
            </>
          )}
        </header>

        {/* Main request builder stack */}
        <main className="flex-1 space-y-4 px-4 pb-4">
          {/* Address card - Summary or Expanded */}
          {showAddressSummary ? (
            // Summary card
            <section className="rounded-lg bg-white p-3 shadow-sm">
              <button
                type="button"
                onClick={() => setEditingSection('address')}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 shrink-0">
                  {selectedAddress && (() => {
                    const IconComponent = getIconByName(selectedAddress.icon || 'Home');
                    return <IconComponent className="w-5 h-5" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {selectedAddress?.label || selectedAddress?.line1?.split(',')[0] || 'Address'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {selectedAddress && formatAddress(selectedAddress)}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            </section>
          ) : (
            // Expanded form
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Delivering to</h2>
                    {hasAddresses && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        Select an address or add a new one
                      </p>
                    )}
                  </div>
                  {selectedAddress && (
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="p-1 -mt-1 -mr-1 shrink-0"
                      aria-label="Confirm selection"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {!hasAddresses && (
                  // Zero-address state with button
                  <div className="w-full flex flex-col items-center justify-center space-y-4">
                    <MapPin className="w-8 h-8 text-slate-600" />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-900">
                        No Saved Addresses
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        You don't have any saved addresses yet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTriggerAddAddress(true)}
                      className="w-full rounded-full bg-black text-white text-base font-semibold active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 py-4 px-6"
                    >
                      <Plus className="w-5 h-5" />
                      Add Your First Address
                    </button>
                  </div>
                )}
                
                {/* Always render AddressSelector to handle triggerAddAddress and modal */}
                <AddressSelector
                  selectedAddressId={selectedAddress?.id || null}
                  onAddressSelect={handleAddressSelect}
                  onAddressChange={() => {
                    // Refresh addresses after add/edit
                  }}
                  onEditingChange={setIsEditingAddress}
                  hideManageButton={true}
                  triggerAddAddress={triggerAddAddress}
                  onAddAddressTriggered={() => setTriggerAddAddress(false)}
                />

                {/* Map preview - Show after address is selected */}
                {showMapCard && (
                  <div className="mt-3 overflow-hidden rounded-lg">
                    <CustomerMapViewport
                      variant="mini"
                      selectedAddress={selectedAddress}
                    >
                      {amount !== null && mode !== null && (
                        <MapSummaryOverlay
                          address={selectedAddress}
                          amount={amount}
                          mode={mode}
                        />
                      )}
                    </CustomerMapViewport>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Amount card - Summary or Expanded */}
          {showAmountSection && (
            showAmountSummary ? (
              // Summary card
              <section className="rounded-lg bg-white p-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => setEditingSection('amount')}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 shrink-0">
                    <span className="text-sm font-bold">$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">
                      ${(amount || MIN_AMOUNT).toLocaleString()}
                    </div>
                    {pricing && (
                      <div className="text-xs text-gray-500">
                        You'll pay ${pricing.total.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </section>
            ) : (
              // Expanded form
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900">
                        How much cash do you need?
                      </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Choose an amount between ${MIN_AMOUNT.toLocaleString()} and ${MAX_AMOUNT.toLocaleString()}
                      </p>
                    </div>
                    {amount && (
                      <button
                        type="button"
                        onClick={() => setEditingSection(null)}
                        className="p-1 -mt-1 -mr-1 shrink-0"
                        aria-label="Confirm selection"
                      >
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <CashAmountInput
                    value={amount || MIN_AMOUNT}
                    onChange={handleAmountChange}
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    step={20}
                  />
                  
                  {/* Pricing Summary - Only show if pricing is available */}
                  {pricing && (
                    <div className="w-full space-y-4 pt-2">
                      <div className="w-full flex justify-between items-center">
                        <span className="text-base font-medium text-gray-900">You'll get</span>
                        <span 
                          className="text-lg font-bold text-gray-900"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          ${(amount || MIN_AMOUNT).toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full flex justify-between items-center">
                        <span className="text-base font-medium text-gray-900">You'll pay</span>
                        <span 
                          className="text-lg font-bold text-gray-900"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          ${pricing.total.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* View breakdown link/expander */}
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

                      {/* Fee Breakdown */}
                      {showFeeDetails && (
                        <div className="overflow-hidden">
                          <div className="space-y-2 pt-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Cash amount</span>
                              <span className="text-gray-900 font-medium">${(amount || MIN_AMOUNT).toFixed(2)}</span>
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )
          )}

          {/* Delivery Style card - Summary or Expanded */}
          {showModeSection && (
            showModeSummary ? (
              // Summary card
              <section className="rounded-lg bg-white p-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => setEditingSection('mode')}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 shrink-0">
                    {mode === 'quick_handoff' ? (
                      <Zap className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {mode === 'quick_handoff' ? 'Speed Mode' : 'Verify Together'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {mode === 'quick_handoff' ? 'Fast handoff, no counting.' : 'Runner counts the cash with you first.'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </section>
            ) : (
              // Expanded form
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Delivery style
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Choose how you'd like to receive your cash.
                    </p>
                  </div>
                  {mode && (
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="p-1 -mt-1 -mr-1 shrink-0"
                      aria-label="Confirm selection"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <DeliveryModeSelector
                  value={mode}
                  onChange={handleModeChange}
                />
              </section>
            )
          )}
        </main>
      </div>
    </MobilePageShell>
  );
}
