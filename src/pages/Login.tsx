import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/db/supabase";
import { toast } from "sonner";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { AnimatedLogo } from "@/components/branding/AnimatedLogo";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('invitation');
    if (token) {
      setInvitationToken(token);
      validateInvitationToken(token).then(invitation => {
        if (invitation) {
          setInvitationValid(true);
          toast.success(`You've been invited to join as ${invitation.role_to_assign}`);
        } else {
          setInvitationValid(false);
          toast.error("Invalid or expired invitation link");
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !redirecting) {
      setRedirecting(true);
      
      if (invitationToken && invitationValid) {
        // Handle invitation acceptance first
        acceptInvitation(invitationToken).then(success => {
          if (success) {
            toast.success("Invitation accepted! Your account has been updated.");
            // Get updated profile and redirect
            getCurrentProfile().then(profile => {
              if (profile) {
                if (profile.role.includes('admin')) {
                  navigate("/admin/dashboard", { replace: true });
                } else if (profile.role.includes('runner')) {
                  navigate("/runner/work", { replace: true });
                } else {
                  navigate("/customer/home", { replace: true });
                }
              } else {
                navigate("/", { replace: true });
              }
            });
          } else {
            toast.error("Failed to accept invitation");
            navigate("/", { replace: true });
          }
        });
      } else {
        // Regular login redirect
        getCurrentProfile().then(profile => {
          if (profile) {
            if (profile.role.includes('admin')) {
              navigate("/admin/dashboard", { replace: true });
            } else if (profile.role.includes('runner')) {
              navigate("/runner/home", { replace: true });
            } else {
              navigate("/customer/home", { replace: true });
            }
          } else {
            navigate("/", { replace: true });
          }
        });
      }
    }
  }, [user, invitationToken, invitationValid, navigate, redirecting]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Redirect to home page after OAuth, which will then redirect based on user role
    const redirectTo = `${window.location.origin}/`;
    console.log('Initiating Google OAuth with redirectTo:', redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error('Google sign-in error', error);
      toast.error('Could not sign in. Check console for details.');
      setLoading(false);
    } else {
      console.log('OAuth redirect initiated, URL:', data?.url);
      // User will be redirected to Google, then back to redirectTo
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex items-center gap-4 mb-4">
            <AnimatedLogo size={64} loop variant="customer" />
            <BenjaminLogo variant="customer" height={32} />
          </div>
        </div>

        {invitationToken && invitationValid && (
          <div className="mb-4 p-4 bg-accent/10 border border-accent rounded-lg text-center">
            <p className="text-sm font-medium">You're joining via invitation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to accept your invitation
            </p>
          </div>
        )}
        {invitationToken && invitationValid === false && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-center">
            <p className="text-sm font-medium">Invalid Invitation</p>
            <p className="text-xs text-muted-foreground mt-1">
              This invitation link is invalid or has expired
            </p>
          </div>
        )}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Benjamin Cash Delivery</CardTitle>
            <CardDescription>Secure cash delivery at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Chrome className="mr-2 h-5 w-5" />
              {loading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
