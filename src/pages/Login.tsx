import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/db/supabase";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { BenjaminLogo } from "@/components/common/BenjaminLogo";
import { AppleLogo } from "@/components/common/AppleLogo";
import { GoogleLogo } from "@/components/common/GoogleLogo";
import { toast } from "sonner";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  
  // Auth state
  const [mode, setMode] = useState<'providers' | 'email'>('providers');
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const token = searchParams.get('invitation');
    if (token) {
      setInvitationToken(token);
      validateInvitationToken(token).then(invitation => {
        if (invitation) {
          setInvitationValid(true);
        } else {
          setInvitationValid(false);
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

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not sign in with Google');
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingProvider('apple');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin + '/',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not sign in with Apple');
      setLoadingProvider(null);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Add your email and a password to continue.');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password should be at least 8 characters.');
      return;
    }

    try {
      setLoadingProvider('email');
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        // Friendly handling if user already exists
        if (error.message.toLowerCase().includes('user already registered')) {
          toast.error('Looks like you already have a Benjamin account. Try signing in with Google or Apple using this email.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Check your email to confirm your account.');
      // Optionally: close form or navigate to a "check your email" screen
      setMode('providers');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not create your account');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-10">
        {/* Top: logo / brand */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BenjaminLogo variant="customer" height={28} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in or create an account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Benjamin delivers cash to your door — securely and discreetly.
          </p>
        </div>

        {/* Invitation notices */}
        {invitationToken && invitationValid && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-sm font-medium text-emerald-900">You're joining via invitation</p>
            <p className="text-xs text-emerald-700 mt-1">
              Sign in to accept your invitation
            </p>
          </div>
        )}
        {invitationToken && invitationValid === false && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm font-medium text-red-900">Invalid Invitation</p>
            <p className="text-xs text-red-700 mt-1">
              This invitation link is invalid or has expired
            </p>
          </div>
        )}

        {/* Middle: buttons or email form */}
        <div className="flex-1 flex flex-col justify-center">
          {mode === 'providers' ? (
            /* State A: Provider buttons */
            <div className="space-y-3">
              {/* Apple button */}
              <Button
                type="button"
                onClick={handleAppleSignIn}
                className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                disabled={!!loadingProvider}
              >
                {loadingProvider === 'apple' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <AppleLogo size={20} className="text-white" />
                )}
                <span className="text-[15px] font-medium">
                  Continue with Apple
                </span>
              </Button>

              {/* Google button */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                disabled={!!loadingProvider}
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleLogo size={20} />
                )}
                <span className="text-[15px] font-medium">
                  Continue with Google
                </span>
              </Button>

              {/* Email toggle button (ghost/outline) */}
              <Button
                type="button"
                onClick={() => setMode('email')}
                variant="outline"
                className="w-full h-[56px] rounded-full border-slate-800 bg-white text-slate-900 hover:bg-slate-50 flex items-center justify-center gap-2"
                disabled={!!loadingProvider}
              >
                <Mail className="h-4 w-4" />
                <span className="text-[15px] font-medium">Continue with Email</span>
              </Button>
            </div>
          ) : (
            /* State B: Email form */
            <div className="space-y-4">
              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  setMode('providers');
                  setEmail('');
                  setPassword('');
                }}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to other options</span>
              </button>

              {/* Email form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Sign up with Email</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-full h-12 text-base border-slate-200 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-full h-12 text-base border-slate-200 placeholder:text-slate-400"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    We only use this to sign you in. No spam, no surprises.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loadingProvider === 'email'}
                  className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 text-base font-medium mt-4"
                >
                  {loadingProvider === 'email' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>

                {/* Optional: Prefer other options */}
                <div className="pt-2">
                  <p className="text-xs text-center text-slate-500">
                    Prefer{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('providers');
                        handleAppleSignIn();
                      }}
                      className="underline hover:text-slate-700"
                    >
                      Apple
                    </button>
                    {' '}or{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('providers');
                        handleGoogleSignIn();
                      }}
                      className="underline hover:text-slate-700"
                    >
                      Google
                    </button>
                    {' '}instead?
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom: terms copy */}
        <p className="mt-4 text-[11px] text-center text-slate-400 leading-snug">
          By continuing, you agree to Benjamin's <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
