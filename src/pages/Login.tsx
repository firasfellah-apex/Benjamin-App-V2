import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/db/supabase";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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
  const [emailMode, setEmailMode] = useState<'signup' | 'signin'>('signup');
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isSignup = emailMode === 'signup';

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

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!email || !password) {
      setFormError('Add your email and a password to continue.');
      return;
    }

    try {
      setLoadingProvider('email');
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setFormError(error.message || 'Could not sign in. Please check your credentials.');
        return;
      }

      // Success - auth context will handle redirect
      // The useEffect above will check profile and redirect accordingly
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Could not sign in');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!email || !password) {
      setFormError('Add your email and a password to continue.');
      return;
    }
    
    if (password.length < 8) {
      setFormError('Password should be at least 8 characters.');
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
          setFormError('Looks like you already have a Benjamin account. Try signing in instead.');
          setEmailMode('signin');
        } else {
          setFormError(error.message);
        }
        return;
      }

      toast.success('Check your email to confirm your account.');
      // Reset form
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Could not create your account');
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

        {/* Middle: unified auth options */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mt-10 space-y-6">
            {/* Apple button */}
            <Button
              type="button"
              className="w-full h-[52px] rounded-full bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
              onClick={handleAppleSignIn}
              disabled={!!loadingProvider}
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AppleLogo size={20} className="text-white" />
              )}
              <span className="text-[15px] font-medium">Continue with Apple</span>
            </Button>

            {/* Google button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-[52px] rounded-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
              disabled={!!loadingProvider}
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleLogo size={20} />
              )}
              <span className="text-[15px] font-medium">Continue with Google</span>
            </Button>

            {/* OR separator */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                or
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Email block */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {isSignup ? 'Sign up with Email' : 'Sign in with Email'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(isSignup ? 'signin' : 'signup');
                    setFormError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {isSignup ? (
                    <>
                      Already have an account?{' '}
                      <span className="underline">Sign in</span>
                    </>
                  ) : (
                    <>
                      New to Benjamin?{' '}
                      <span className="underline">Create account</span>
                    </>
                  )}
                </button>
              </div>

              <form
                onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn}
                className="space-y-3"
              >
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs text-red-600">{formError}</p>
                  </div>
                )}

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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError(null);
                    }}
                    className="rounded-full h-12 text-base border-slate-200 placeholder:text-slate-400"
                    required
                    disabled={loadingProvider === 'email'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder={isSignup ? 'Create a password' : 'Enter your password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError(null);
                    }}
                    className="rounded-full h-12 text-base border-slate-200 placeholder:text-slate-400"
                    required
                    minLength={isSignup ? 8 : undefined}
                    disabled={loadingProvider === 'email'}
                  />
                  {isSignup && (
                    <p className="text-xs text-slate-500 mt-1">
                      We'll only use this to sign you in. No spam, no surprises.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loadingProvider === 'email'}
                  className="w-full h-[52px] rounded-full bg-black text-white hover:bg-black/90 text-base font-medium"
                >
                  {loadingProvider === 'email' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isSignup ? 'Creating account…' : 'Signing in…'}
                    </>
                  ) : (
                    isSignup ? 'Create account' : 'Sign in'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom: terms copy */}
        <p className="mt-4 text-[11px] text-center text-slate-400 leading-snug">
          By continuing, you agree to Benjamin's <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
