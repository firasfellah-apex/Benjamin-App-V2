import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LoginPanel } from "miaoda-auth-react";
import { useAuth } from "miaoda-auth-react";
import { toast } from "sonner";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";

const login_config = {
  title: 'Benjamin Cash Delivery',
  desc: 'Secure cash delivery at your fingertips',
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL,
  userPolicyUrl: import.meta.env.VITE_USER_POLICY_URL,
  showPolicy: import.meta.env.VITE_SHOW_POLICY,
  policyPrefix: import.meta.env.VITE_POLICY_PREFIX,
  loginType: import.meta.env.VITE_LOGIN_TYPE
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

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
                  navigate("/runner/available", { replace: true });
                } else {
                  navigate("/customer/request", { replace: true });
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
              navigate("/runner/available", { replace: true });
            } else {
              navigate("/customer/request", { replace: true });
            }
          } else {
            navigate("/", { replace: true });
          }
        });
      }
    }
  }, [user, invitationToken, invitationValid, navigate, redirecting]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
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
        <LoginPanel {...login_config} />
      </div>
    </div>
  );
}
