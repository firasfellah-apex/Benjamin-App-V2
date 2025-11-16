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
import { CustomerScreen } from '@/pages/customer/components/CustomerScreen';
import { CustomerMapViewport } from '@/components/customer/layout/CustomerMapViewport';
import { RequestFlowBottomBar } from '@/components/customer/RequestFlowBottomBar';
import { AddressSelector } from '@/components/address/AddressSelector';
import CashAmountInput from '@/components/customer/CashAmountInput';
import { DeliveryModeSelector, type DeliveryMode } from '@/components/customer/DeliveryModeSelector';
import { MapSummaryOverlay } from '@/components/customer/MapSummaryOverlay';
import { useCustomerAddresses } from '@/features/address/hooks/useCustomerAddresses';
import { useCustomerBottomSlot } from '@/contexts/CustomerBottomSlotContext';
import type { CustomerAddress } from '@/types/types';
import { MapPin } from '@/lib/icons';
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
  }, []);

  // Handle amount change
  const handleAmountChange = useCallback((newAmount: number) => {
    setAmount(newAmount);
    track('cash_amount_changed', {
      amount: newAmount,
      amount_range: newAmount < 200 ? 'low' : newAmount < 500 ? 'medium' : 'high',
    });
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((newMode: DeliveryMode) => {
    setMode(newMode);
    track('delivery_mode_selected', { mode: newMode });
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
  const title = useMemo(() => {
    if (!isReady) return undefined;
    return `Good ${getGreetingTime()}${displayName ? `, ${displayName}` : ""}`;
  }, [isReady, displayName]);

  // Progressive visibility logic
  const hasAddresses = addresses.length > 0;
  const showAmountSection = hasAddresses && selectedAddress !== null;
  const showModeSection = showAmountSection && amount !== null;
  const showMapCard = showModeSection && mode !== null;
  const canSubmit = selectedAddress !== null && amount !== null && mode !== null;

  // Handle primary action: submit if ready, or trigger add address if no addresses
  const handlePrimaryAction = useCallback(() => {
    if (!hasAddresses) {
      // Trigger add address form
      setTriggerAddAddress(true);
      return;
    }
    handleSubmit();
  }, [hasAddresses, handleSubmit]);

  // Set bottom slot
  useEffect(() => {
    setBottomSlot(
      <RequestFlowBottomBar
        mode="home"
        onPrimary={handlePrimaryAction}
        isLoading={isSubmitting}
        primaryDisabled={hasAddresses ? !canSubmit : false}
        primaryLabel={hasAddresses ? "Request Cash" : "Add Your First Address"}
        useFixedPosition={true}
      />
    );
    return () => setBottomSlot(null);
  }, [setBottomSlot, handlePrimaryAction, isSubmitting, canSubmit, hasAddresses]);

  // If no user, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const loading = authLoading || (user && !isReady) || addressesLoading;

  return (
    <CustomerScreen
      loading={loading}
      title={title}
      subtitle="Ready when you are."
      stepKey="home"
      fillViewport={true}
    >
      <div className="space-y-6">
        {/* Address Section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delivering to</h2>
            {hasAddresses && (
              <p className="text-sm text-gray-600 mt-0.5">
                Select an address or add a new one
              </p>
            )}
          </div>

          <AddressSelector
            selectedAddressId={selectedAddress?.id || null}
            onAddressSelect={handleAddressSelect}
            onAddressChange={() => {
              // Refresh addresses after add/edit
              if (addresses.length === 0) {
                // If we just added first address, it will auto-select via useEffect
              }
            }}
            onEditingChange={setIsEditingAddress}
            hideManageButton={true}
            triggerAddAddress={triggerAddAddress}
            onAddAddressTriggered={() => setTriggerAddAddress(false)}
          />
          
          {!hasAddresses && (
            // Zero-address helper text
            <p className="text-sm text-slate-500 text-center mt-2">
              You don't have any saved addresses yet.
            </p>
          )}
        </div>

        {/* Amount Section - Only show if address selected */}
        {showAmountSection && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                How much cash do you need?
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Choose an amount between ${MIN_AMOUNT.toLocaleString()} and ${MAX_AMOUNT.toLocaleString()}
              </p>
            </div>
            <CashAmountInput
              value={amount || MIN_AMOUNT}
              onChange={handleAmountChange}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={20}
            />
          </div>
        )}

        {/* Mode Section - Only show if amount selected */}
        {showModeSection && (
          <div className="space-y-3">
            <DeliveryModeSelector
              value={mode}
              onChange={handleModeChange}
            />
          </div>
        )}

        {/* Mini-map Summary Card - Only show if mode selected */}
        {showMapCard && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delivery Summary</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Review your delivery details
              </p>
            </div>
            <CustomerMapViewport
              variant="mini"
              selectedAddress={selectedAddress}
            >
              <MapSummaryOverlay
                address={selectedAddress}
                amount={amount}
                mode={mode}
              />
            </CustomerMapViewport>
          </div>
        )}
      </div>
    </CustomerScreen>
  );
}
