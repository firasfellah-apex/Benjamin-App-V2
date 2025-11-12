import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Truck, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { getCurrentProfile } from "@/db/api";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    // Wait for auth and profile to finish loading before checking
    if (authLoading || profileLoading) {
      return;
    }

    if (user) {
      // If profile is loaded, use it for routing
      if (profile) {
        console.log('User authenticated with profile, redirecting based on role:', profile.role);
        
        if (profile.role.includes('admin')) {
          navigate('/admin/dashboard', { replace: true });
        } else if (profile.role.includes('runner')) {
          navigate('/runner/home', { replace: true });
        } else {
          navigate('/customer/home', { replace: true });
        }
      } else {
        // Profile not loaded yet, try to fetch it
        console.log('Profile not loaded, fetching...');
        getCurrentProfile().then(profile => {
          if (profile) {
            console.log('Profile fetched, redirecting based on role:', profile.role);
            
            if (profile.role.includes('admin')) {
              navigate('/admin/dashboard', { replace: true });
            } else if (profile.role.includes('runner')) {
              navigate('/runner/home', { replace: true });
            } else {
              navigate('/customer/home', { replace: true });
            }
          } else {
            // No profile found, default to customer home
            console.log('No profile found, defaulting to customer home');
            navigate('/customer/home', { replace: true });
          }
        });
      }
    }
  }, [user, profile, authLoading, profileLoading, navigate]);

  // Show loading while checking auth or profile
  if (authLoading || profileLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Only show landing page to unauthenticated users
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container max-w-7xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Benjamin Cash Delivery</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Secure, fast, and reliable cash delivery service at your fingertips
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={() => navigate("/login")}>
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Shield className="h-5 w-5" />
                Secure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                OTP verification and complete audit trail for every transaction
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Real-time order tracking and quick delivery to your location
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Truck className="h-5 w-5" />
                Transparent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clear fee breakdown with no hidden charges
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">
          Sign up now and experience secure cash delivery
        </p>
        <Button size="lg" onClick={() => navigate("/login")}>
          Sign Up / Login
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
