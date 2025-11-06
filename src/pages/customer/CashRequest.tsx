import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { calculateFees, createOrder } from "@/db/api";
import { useProfile } from "@/contexts/ProfileContext";

export default function CashRequest() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [amount, setAmount] = useState(100);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fees = calculateFees(amount);

  const handleAmountChange = (value: number[]) => {
    const roundedAmount = Math.round(value[0] / 20) * 20;
    setAmount(Math.max(100, Math.min(1000, roundedAmount)));
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!customerAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }

    if (profile && profile.daily_usage + fees.totalPayment > profile.daily_limit) {
      toast.error(`Daily limit exceeded. Available: $${(profile.daily_limit - profile.daily_usage).toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder(amount, customerAddress, customerName, customerNotes);
      if (order) {
        toast.success("Order created successfully!");
        navigate(`/customer/orders/${order.id}`);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Request Cash Delivery</h1>
        <p className="text-muted-foreground">
          Get cash delivered securely to your location
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash Amount</CardTitle>
            <CardDescription>
              Select amount between $100 - $1,000 (in $20 increments)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="address">Delivery Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, State"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Ring doorbell, meet at lobby, call when arriving..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide any special instructions for the runner
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Breakdown</CardTitle>
            <CardDescription>
              Transparent pricing for your cash delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Requested Amount</span>
                <span className="font-semibold">${fees.requestedAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Platform Fee</span>
                <span className="text-sm">${fees.profit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Compliance Fee</span>
                <span className="text-sm">${fees.complianceFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Delivery Fee</span>
                <span className="text-sm">${fees.deliveryFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Total Service Fee</span>
                <span className="font-semibold">${fees.totalServiceFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-3 bg-primary text-primary-foreground rounded-lg px-4 mt-4">
                <span className="font-bold">Total Payment</span>
                <span className="text-2xl font-bold">${fees.totalPayment.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Your daily limit: ${profile?.daily_limit.toFixed(2) || '0.00'}
                <br />
                Used today: ${profile?.daily_usage.toFixed(2) || '0.00'}
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              {loading ? "Creating Order..." : "Request Cash Delivery"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
