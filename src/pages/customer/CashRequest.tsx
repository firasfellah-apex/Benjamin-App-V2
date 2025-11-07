import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ChevronDown, ChevronUp, MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { createOrder, formatAddress } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";
import { strings } from "@/lib/strings";
import { AddressSelector } from "@/components/address/AddressSelector";
import type { CustomerAddress } from "@/types/types";
import { calculatePricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  
  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(true); // Expanded by default

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

  const handleAmountChange = (value: number[]) => {
    const roundedAmount = Math.round(value[0] / 20) * 20;
    setAmount(Math.max(100, Math.min(1000, roundedAmount)));
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
      // Auto-pull delivery notes from selected address
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
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(strings.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
              step === 1 ? "bg-black text-white" : "bg-black text-white"
            )}>
              1
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors",
              step === 1 ? "text-foreground" : "text-foreground"
            )}>
              Location
            </span>
          </div>

          <div className="w-16 h-0.5 bg-border relative overflow-hidden">
            <div 
              className={cn(
                "absolute inset-0 bg-black transition-transform duration-500",
                step === 1 ? "translate-x-[-100%]" : "translate-x-0"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
              step === 2 ? "bg-black text-white" : "bg-muted text-muted-foreground"
            )}>
              2
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors",
              step === 2 ? "text-foreground" : "text-muted-foreground"
            )}>
              Amount
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Delivery Location */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Where should we deliver your cash?</h1>
            <p className="text-muted-foreground">
              Choose or add a location. We'll come to you.
            </p>
          </div>

          <AddressSelector
            selectedAddressId={selectedAddress?.id || null}
            onAddressSelect={handleAddressSelect}
            onAddressChange={() => {}}
          />

          {/* Sticky CTA */}
          <div className="sticky bottom-4 pt-6">
            <Button
              onClick={handleNextStep}
              disabled={!selectedAddress}
              className="w-full h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next · Set amount
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Amount & Summary */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">How much do you need?</h1>
            <p className="text-muted-foreground">
              Select your amount. Benjamin handles the rest.
            </p>
          </div>

          {/* Selected Address Recap */}
          {selectedAddress && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Delivering to: {selectedAddress.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedAddress.line1}
                        {selectedAddress.line2 && `, ${selectedAddress.line2}`}
                        <br />
                        {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                      </p>
                      {selectedAddress.delivery_notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Note: {selectedAddress.delivery_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="text-xs h-8"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Amount Selection with Integrated Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Amount</CardTitle>
              <CardDescription>Choose between $100 and $1,000</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="text-6xl font-bold transition-all duration-200">
                    ${amount}
                  </div>
                </div>

                <Slider
                  value={[amount]}
                  onValueChange={handleAmountChange}
                  min={100}
                  max={1000}
                  step={20}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>$100</span>
                  <span>$1,000</span>
                </div>
              </div>

              {/* Integrated Pricing Summary */}
              {pricing && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Top-line Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">You'll receive</span>
                      <span className="text-2xl font-bold">${amount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-sm text-muted-foreground">Total charge</span>
                      <span className="text-xl font-semibold">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Fee Breakdown Toggle */}
                  <button
                    onClick={() => setShowFeeDetails(!showFeeDetails)}
                    className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>See how it adds up</span>
                    <div className="flex items-center gap-1">
                      <span className="underline">
                        {showFeeDetails ? 'Hide details' : 'Show details'}
                      </span>
                      {showFeeDetails ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </button>

                  {/* Fee Breakdown */}
                  {showFeeDetails && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Cash amount</span>
                        <span>${amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Platform fee</span>
                        <span>${pricing.platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Compliance fee</span>
                        <span>${pricing.complianceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Delivery fee</span>
                        <span>${pricing.deliveryFee.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sticky CTA */}
          <div className="sticky bottom-4 pt-6 space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedAddress || !pricing}
              className="w-full h-12 rounded-xl bg-black text-white text-base font-semibold hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <DollarSign className="mr-2 h-5 w-5" />
                  Request Cash Delivery
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground px-4">
              By confirming, you agree to Benjamin's terms and understand this request is binding once a runner prepares your order.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
