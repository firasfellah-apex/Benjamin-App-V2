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
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { CustomerTopShell } from "@/pages/customer/components/CustomerTopShell";
import { CustomerMapViewport } from "@/components/customer/layout/CustomerMapViewport";
import { CustomerOrderFlowFooter } from "@/components/customer/layout/CustomerOrderFlowFooter";
import { useLocation } from "@/contexts/LocationContext";
import { PricingSummarySkeleton } from "@/components/customer/CustomerSkeleton";
import { MapPin } from "@/lib/icons";

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
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false); // Collapsed by default
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Calculate map center: selected address > live location > fallback
  const mapCenter = useMemo(() => {
    if (selectedAddress?.latitude && selectedAddress?.longitude) {
      return {
        lat: selectedAddress.latitude,
        lng: selectedAddress.longitude,
      };
    }
    return liveLocation;
  }, [selectedAddress, liveLocation]);

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

  // Calculate pricing
  const pricing = selectedAddress 
    ? calculatePricing({
        amount,
        customerAddress: {
          lat: selectedAddress.latitude || 0,
          lng: selectedAddress.longitude || 0
        }
      })
    : null;

  // Handle amount change from CashAmountInput component
  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
  };

  const handleAddressSelect = (address: CustomerAddress) => {
    setSelectedAddress(address);
  };

  const handleNextStep = () => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedAddress) {
      toast.error(strings.customer.addressRequiredError);
      return;
    }

    if (!pricing) {
      toast.error("Unable to calculate pricing");
      return;
    }

    if (profile && profile.daily_usage + pricing.total > profile.daily_limit) {
      toast.error(`${strings.customer.dailyLimitExceeded} $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

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
        navigate(`/customer/orders/${order.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error?.message || error?.error?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Address Selection
  if (step === 1) {
    return (
      <CustomerScreen
        header={
          <CustomerTopShell
            title="Where should we deliver?"
            subtitle="Select a location. You can save more than one."
            topContent={
              <div className="space-y-4">
                <AddressSelector
                  selectedAddressId={selectedAddress?.id || searchParams.get('address_id') || null}
                  onAddressSelect={handleAddressSelect}
                  onAddressChange={() => {}}
                  onEditingChange={setIsEditingAddress}
                  onAddressesCountChange={() => {}}
                  hideManageButton={true}
                />
                <button
                  onClick={() => navigate("/customer/addresses")}
                  className="
                    w-full mt-4
                    rounded-full border border-slate-200 bg-white
                    py-4 px-6
                    text-base font-semibold text-slate-900
                    flex items-center justify-center gap-2
                    shadow-sm
                    active:scale-[0.98] active:bg-slate-50 transition-transform duration-150
                  "
                >
                  <MapPin className="w-5 h-5" />
                  Manage Addresses
                </button>
              </div>
            }
          />
        }
        map={<CustomerMapViewport center={mapCenter} />}
        footer={
          !isEditingAddress ? (
            <CustomerOrderFlowFooter
              mode="address"
              onPrimary={handleNextStep}
              onSecondary={() => navigate('/customer/home')}
              isLoading={false}
              primaryDisabled={!selectedAddress}
            />
          ) : undefined
        }
      />
    );
  }

  // Step 2: Cash Amount
  return (
    <CustomerScreen
      header={
        <CustomerTopShell
          title="How much cash do you need?"
          subtitle="Choose an amount to have delivered."
          topContent={
            <div className="space-y-6">
              {/* Main Amount Display */}
              <div className="flex-shrink-0 mb-2" style={{ minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!isEditingAmount ? (
                  <div 
                    onClick={() => {
                      setIsEditingAmount(true);
                      setTimeout(() => amountInputRef.current?.focus(), 0);
                    }}
                    className="cursor-text transition-opacity hover:opacity-70"
                    style={{ 
                      fontSize: 48, 
                      fontWeight: 700, 
                      color: '#0F172A',
                      textAlign: 'center'
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
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        if (/^\d*$/.test(val)) {
                          const num = parseInt(val) || 0;
                          const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, num));
                          setAmount(clamped);
                        }
                      }}
                      onBlur={() => {
                        // Round to nearest step
                        const rounded = Math.round(amount / 20) * 20;
                        const clamped = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, rounded));
                        setAmount(clamped);
                        setIsEditingAmount(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
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
              <div className="flex-shrink-0 mb-4 text-center">
                <p className="text-sm text-gray-600">
                  ${MIN_AMOUNT.toLocaleString()}–${MAX_AMOUNT.toLocaleString()} range
                </p>
              </div>

              {/* Amount Selection Components (Preset Buttons & Slider) */}
              <div className="flex-shrink-0 mb-6">
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
              <div className="flex-shrink-0 mb-6">
                {!pricing ? (
                  <PricingSummarySkeleton />
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-gray-900">You'll get</span>
                      <span className="text-lg font-bold text-gray-900">
                        ${amount.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-gray-900">You'll pay</span>
                      <span className="text-lg font-bold text-gray-900">
                        ${pricing.total.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* View breakdown link/expander */}
                    <button
                      onClick={() => setShowFeeDetails(!showFeeDetails)}
                      className="w-full flex items-center justify-between hover:opacity-70 transition-opacity pt-2 border-t border-gray-200"
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
                      <div className="space-y-2 pt-3 animate-in fade-in duration-200">
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
                    )}
                  </div>
                )}
              </div>

              {/* Terms Block */}
              <div className="flex-shrink-0">
                <p className="text-xs text-gray-600 text-center leading-relaxed">
                  By confirming, you agree to Benjamin's terms.<br />
                  Once a runner begins preparing your order, it can't be changed.
                </p>
              </div>
            </div>
          }
        />
      }
      map={<CustomerMapViewport center={mapCenter} />}
      footer={
        <CustomerOrderFlowFooter
          mode="amount"
          onPrimary={handleSubmit}
          onSecondary={() => setStep(1)}
          isLoading={loading}
          primaryDisabled={loading || !selectedAddress || !pricing}
        />
      }
    />
  );
}



