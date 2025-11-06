import { useNavigate } from "react-router-dom";
import { DollarSign, Truck, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/contexts/ProfileContext";

export default function Home() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Benjamin Cash Delivery</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Secure, fast, and reliable cash delivery service at your fingertips
        </p>
      </div>

      {profile && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Quick Actions</h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {profile.role.includes('customer') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/customer/request")}>
                <CardHeader>
                  <DollarSign className="h-12 w-12 mb-4 text-accent" />
                  <CardTitle>Request Cash</CardTitle>
                  <CardDescription>
                    Get cash delivered to your location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Request Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {profile.role.includes('runner') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/runner/available")}>
                <CardHeader>
                  <Truck className="h-12 w-12 mb-4 text-accent" />
                  <CardTitle>Available Orders</CardTitle>
                  <CardDescription>
                    View and accept delivery orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    View Orders
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {profile.role.includes('admin') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/dashboard")}>
                <CardHeader>
                  <Shield className="h-12 w-12 mb-4 text-accent" />
                  <CardTitle>Admin Dashboard</CardTitle>
                  <CardDescription>
                    Manage users and monitor orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Open Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="mt-16">
        <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Cash</h3>
            <p className="text-muted-foreground">
              Select the amount you need and provide your delivery address
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Runner Accepts</h3>
            <p className="text-muted-foreground">
              A verified runner accepts your order and withdraws the cash
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Delivery</h3>
            <p className="text-muted-foreground">
              Receive your cash with OTP verification for maximum security
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 bg-card rounded-lg p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Why Choose Benjamin?</h2>
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">🔒 Secure</h3>
            <p className="text-sm text-muted-foreground">
              OTP verification and complete audit trail for every transaction
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">⚡ Fast</h3>
            <p className="text-sm text-muted-foreground">
              Real-time order tracking and quick delivery to your location
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">💰 Transparent</h3>
            <p className="text-sm text-muted-foreground">
              Clear fee breakdown with no hidden charges
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
