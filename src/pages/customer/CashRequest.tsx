import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { createOrder, formatAddress } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";
import { strings } from "@/lib/strings";
import { AddressSelector } from "@/components/address/AddressSelector";
import type { CustomerAddress } from "@/types/types";
import { calculatePricing } from "@/lib/pricing";

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [amount, setAmount] = useState(100);
  const [customerNotes, setCustomerNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Calculate pricing using the new pricing function
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

  const handleAddressChange = () => {
    // Trigger re-render when address is added/updated
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
      const order = await createOrder(
        amount,
        formatAddress(selectedAddress), // Legacy field
        customerNotes,
        selectedAddress.id // New address_id field
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

  const isFormValid = selectedAddress && pricing;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{strings.customer.newOrderTitle}</h1>
        <p className="text-muted-foreground">
          {strings.customer.newOrderSubtitle}
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Delivery Location */}
        <AddressSelector
          selectedAddressId={selectedAddress?.id || null}
          onAddressSelect={handleAddressSelect}
          onAddressChange={handleAddressChange}
        />

        {/* Step 2: Cash Amount (gated) */}
        <Card className={!selectedAddress ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {strings.customer.cashAmountTitle}
              {!selectedAddress && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {selectedAddress 
                ? strings.customer.cashAmountDesc
                : strings.customer.addressGatingMessage
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedAddress ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {strings.customer.addressGatingMessage}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="text-5xl font-bold">${amount}</div>
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

                <div>
                  <Label htmlFor="notes">{strings.customer.deliveryNotesLabel}</Label>
                  <Textarea
                    id="notes"
                    placeholder={strings.customer.deliveryNotesPlaceholder}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {strings.customer.deliveryNotesHelp}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Fee Breakdown (gated) */}
        <Card className={!selectedAddress ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {strings.customer.feeBreakdownTitle}
              {!selectedAddress && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {selectedAddress 
                ? strings.customer.feeBreakdownDesc
                : strings.customer.addressGatingMessage
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedAddress ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {strings.customer.addressGatingMessage}
                </AlertDescription>
              </Alert>
            ) : pricing ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">{strings.customer.cashAmount}</span>
                    <span className="font-semibold">${amount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{strings.customer.platformFee}</span>
                    <span className="text-sm">${pricing.platformFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">{strings.customer.complianceFee}</span>
                    <span className="text-sm">${pricing.complianceFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">{strings.customer.deliveryFee}</span>
                    <span className="text-sm">${pricing.deliveryFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">{strings.customer.totalServiceFee}</span>
                    <span className="font-semibold">${pricing.totalServiceFee.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 text-primary-foreground rounded-lg px-4 mt-4 bg-[#fafafafa] bg-none">
                    <span className="font-bold text-[#000000ff]">{strings.customer.totalPayment}</span>
                    <span className="text-2xl font-bold text-[#000000ff]">${pricing.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {strings.customer.dailyLimitInfo}: ${profile?.daily_limit.toFixed(2) || '0.00'}
                    <br />
                    {strings.customer.usedToday}: ${profile?.daily_usage.toFixed(2) || '0.00'}
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !isFormValid}
                  className="w-full"
                  size="lg"
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  {loading ? strings.buttons.loading : strings.customer.submitButton}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By confirming, you agree to Benjamin's terms and understand this request is binding once a runner prepares your order.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
