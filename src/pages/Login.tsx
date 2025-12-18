import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/db/supabase";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";
import { AppleLogo } from "@/components/common/AppleLogo";
import { GoogleLogo } from "@/components/common/GoogleLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import fullLogo from "@/assets/illustrations/FullLogo.png";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  
  // Auth state
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

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

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Please enter your first and last name.');
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
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (error) {
        // Friendly handling if user already exists
        if (error.message.toLowerCase().includes('user already registered')) {
          setFormError('Looks like you already have a Benjamin account. Try signing in instead.');
          setMode('signin');
        } else {
          setFormError(error.message);
        }
        return;
      }

      toast.success('Check your email to confirm your account.');
      // Reset form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Could not create your account');
    } finally {
      setLoadingProvider(null);
    }
  };

  const resetForm = () => {
    setShowEmailForm(false);
    setFormError(null);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col px-6 pb-8 pt-8">
        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md">
            {/* Full Logo - 75% of toggle width, centered with equal spacing above and below */}
            <div className="flex justify-center mb-8 mt-8">
              <img 
                src={fullLogo} 
                alt="Benjamin" 
                className="w-3/4 max-w-full"
              />
            </div>
            {/* Sign Up / Log In Toggle - Reusing DeliveryModeSelector style */}
            <div className="rounded-3xl border border-slate-100 bg-[#F7F7F7] p-1 flex gap-2 mb-6 relative">
              {/* Sliding background indicator */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-full bg-white border border-black z-0"
                initial={false}
                animate={{
                  left: mode === 'signup' ? '4px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 4px)',
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                style={{ height: '52px' }}
              />
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetForm();
                }}
                className={cn(
                  "relative flex-1 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 z-10",
                  mode === 'signup'
                    ? "text-slate-900"
                    : "text-slate-900"
                )}
                style={{ height: '52px' }}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetForm();
                }}
                className={cn(
                  "relative flex-1 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 z-10",
                  mode === 'signin'
                    ? "text-slate-900"
                    : "text-slate-900"
                )}
                style={{ height: '52px' }}
              >
                Log In
              </button>
            </div>

            {/* Welcome message - center aligned */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                {mode === 'signup' ? "Welcome! Let's get you in!" : "Welcome Back!"}
              </h1>
              <p className="text-sm text-slate-600">
                How would you like to continue?
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

            {/* Unified auth options */}
            <div className="space-y-4 relative">
            <AnimatePresence mode="wait">
              {!showEmailForm ? (
                <motion.div
                  key="social-buttons"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {/* Google button */}
                  <Button
                    type="button"
                    className="w-full h-[58px] rounded-xl bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
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

                  {/* Apple button */}
                  <Button
                    type="button"
                    className="w-full h-[58px] rounded-xl bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
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

                  {/* Email button */}
                  <Button
                    type="button"
                    className="w-full h-[58px] rounded-xl bg-black text-white hover:bg-black/90 flex items-center justify-center gap-2"
                    onClick={() => {
                      setShowEmailForm(true);
                      setFormError(null);
                    }}
                    disabled={!!loadingProvider}
                  >
                    <Mail className="h-5 w-5" />
                    <span className="text-[15px] font-medium">Continue with Email</span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <form
                    onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn}
                    className="space-y-4"
                  >
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs text-red-600">{formError}</p>
                    </div>
                  )}

                  {/* First name and Last name - only for signup */}
                  {isSignup && (
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setFormError(null);
                        }}
                        className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                        disabled={loadingProvider === 'email'}
                      />
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          setFormError(null);
                        }}
                        className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                        disabled={loadingProvider === 'email'}
                      />
                    </div>
                  )}

                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError(null);
                    }}
                    className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                    required
                    disabled={loadingProvider === 'email'}
                  />

                  <div className="space-y-2">
                    <Input
                      id="password"
                      type="password"
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFormError(null);
                      }}
                      className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                      required
                      minLength={isSignup ? 8 : undefined}
                      disabled={loadingProvider === 'email'}
                    />
                    {/* Forgot password link - only for signin */}
                    {!isSignup && (
                      <div className="text-right">
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-[58px] rounded-xl border-slate-200 !text-slate-900 hover:bg-slate-50 hover:!text-slate-900"
                      onClick={resetForm}
                      disabled={loadingProvider === 'email'}
                    >
                      <span className="text-[15px] font-medium !text-slate-900">Cancel</span>
                    </Button>
                    <Button
                      type="submit"
                      disabled={loadingProvider === 'email'}
                      className="flex-1 h-[58px] rounded-xl bg-black text-white hover:bg-black/90"
                    >
                      {loadingProvider === 'email' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-[15px] font-medium">
                            {isSignup ? 'Creating account…' : 'Signing in…'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[15px] font-medium">
                          {isSignup ? 'Create Account' : 'Log In'}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
                </motion.div>
              )}
            </AnimatePresence>
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
