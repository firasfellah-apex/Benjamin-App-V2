import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { createTestOrder } from "@/db/api";

export default function RunnerTraining() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const handleCreateTestOrder = async () => {
    setCreating(true);
    try {
      const result = await createTestOrder();
      if (result.success && result.orderId) {
        setLastOrderId(result.orderId);
        toast.success("Test order created successfully!");
      } else {
        toast.error(result.message || "Failed to create test order");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-[95vw] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Runner Training & Testing</h1>
        </div>
        <p className="text-muted-foreground">
          Create test orders for runner onboarding and training purposes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Test Order</CardTitle>
            <CardDescription>
              Generate a mock order for runner training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Amount:</span>
                <span className="font-semibold">$100.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup Location:</span>
                <span className="font-semibold">ABC Bank ATM, 123 XYZ Street</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Location:</span>
                <span className="font-semibold">Central Office, 456 Main Avenue</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Runner Earnings:</span>
                <span className="font-semibold text-success">$8.16</span>
              </div>
            </div>

            <Button
              onClick={handleCreateTestOrder}
              disabled={creating}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Create Test Order"}
            </Button>

            {lastOrderId && (
              <Alert className="bg-success/10 border-success">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle className="text-success">Test Order Created!</AlertTitle>
                <AlertDescription className="text-success/80">
                  Order ID: #{lastOrderId.slice(0, 8)}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate(`/admin/orders/${lastOrderId}`)}
                    className="ml-2 h-auto p-0 text-success hover:text-success/80"
                  >
                    View Order
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Instructions</CardTitle>
            <CardDescription>
              How to use test orders for runner training
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">For New Runners:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Create a test order using the button</li>
                  <li>Have the runner log into their account</li>
                  <li>Runner should see the test order in "Available Orders"</li>
                  <li>Runner accepts the order</li>
                  <li>Runner follows the delivery steps</li>
                  <li>Complete the full workflow including PIN verification</li>
                </ol>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription>
                  Test orders are marked with a 🎓 training emoji in the delivery notes.
                  They follow the exact same workflow as real orders.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complete Order Lifecycle</CardTitle>
          <CardDescription>
            Understanding the order status progression
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">1. Pending</div>
                <p className="text-sm text-muted-foreground">
                  Order is created and waiting for a runner to accept it. Visible in "Available Orders" for all runners.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">2. Runner Accepted</div>
                <p className="text-sm text-muted-foreground">
                  Runner has accepted the order and is heading to the ATM. Customer can no longer cancel.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">3. Runner at ATM</div>
                <p className="text-sm text-muted-foreground">
                  Runner has arrived at the ATM and is ready to withdraw cash.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">4. Cash Withdrawn</div>
                <p className="text-sm text-muted-foreground">
                  Runner has withdrawn the cash. PIN is generated and sent to customer.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">5. Pending Handoff</div>
                <p className="text-sm text-muted-foreground">
                  Runner is meeting with customer. Waiting for PIN verification to complete delivery.
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">6. Completed</div>
                <p className="text-sm text-muted-foreground">
                  PIN verified successfully. Cash delivered. Runner receives payment.
                </p>
              </div>
            </div>

            <Alert className="bg-primary/10 border-primary">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Real-Time Updates</AlertTitle>
              <AlertDescription className="text-primary/80">
                All status changes are synchronized in real-time across customer, runner, and admin interfaces.
                No manual refresh required.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Common Issues</CardTitle>
          <CardDescription>
            Solutions for frequently encountered problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Order not appearing in Available Orders</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Solution:</strong> Ensure the runner is logged in with a runner role. Check that the order status is "Pending". 
                Real-time updates should show new orders automatically.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Status not updating after acceptance</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Solution:</strong> This issue has been fixed. The status badge now updates in real-time to reflect the current order state.
                If the issue persists, check browser console for errors.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">PIN not generating</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Solution:</strong> Ensure the order status is "Runner at ATM" before clicking "Cash Withdrawn - Generate PIN".
                The PIN is valid for 10 minutes with a maximum of 3 attempts.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Cannot complete delivery</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Solution:</strong> Verify that the 4-digit PIN is entered correctly. Check that the PIN hasn't expired (10-minute limit).
                If attempts are exhausted, a new PIN must be generated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
