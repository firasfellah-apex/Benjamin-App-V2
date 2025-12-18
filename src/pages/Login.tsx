import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/db/supabase";
import { validateInvitationToken, acceptInvitation, getCurrentProfile } from "@/db/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | 'email' | 'forgot' | 'reset' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Check for password reset token
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      setResetToken(accessToken);
      setShowResetPassword(true);
      setShowEmailForm(true);
      setMode('signin');
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
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
                const isAdmin = profile.role?.includes('admin');
                const isRunner = profile.role?.includes('runner');
                const isCustomer = !isAdmin && !isRunner;
                
                // Check if customer needs onboarding
                const needsOnboarding = isCustomer && (!profile.first_name || !profile.last_name);
                
                if (isAdmin) {
                  navigate("/admin/dashboard", { replace: true });
                } else if (isRunner) {
                  navigate("/runner/work", { replace: true });
                } else if (needsOnboarding) {
                  navigate("/onboarding/profile", { replace: true });
                } else {
                  navigate("/customer/home", { replace: true });
                }
              } else {
                // No profile found - likely new signup, redirect to onboarding
                navigate("/onboarding/profile", { replace: true });
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
            const isAdmin = profile.role?.includes('admin');
            const isRunner = profile.role?.includes('runner');
            const isCustomer = !isAdmin && !isRunner;
            
            // Check if customer needs onboarding
            const needsOnboarding = isCustomer && (!profile.first_name || !profile.last_name);
            
            if (isAdmin) {
              navigate("/admin/dashboard", { replace: true });
            } else if (isRunner) {
              navigate("/runner/home", { replace: true });
            } else if (needsOnboarding) {
              navigate("/onboarding/profile", { replace: true });
            } else {
              navigate("/customer/home", { replace: true });
            }
          } else {
            // No profile found - likely new signup, redirect to onboarding
            navigate("/onboarding/profile", { replace: true });
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
    setShowForgotPassword(false);
    setShowResetPassword(false);
    setFormError(null);
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setResetEmail('');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!resetEmail.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    try {
      setLoadingProvider('forgot');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        setFormError(error.message || 'Could not send reset email.');
        return;
      }

      toast.success('Check your email for password reset instructions.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Could not send reset email');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword || !confirmPassword) {
      setFormError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setFormError('Password should be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setLoadingProvider('reset');
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setFormError(error.message || 'Could not reset password.');
        return;
      }

      toast.success('Password reset successfully! Signing you in...');
      // Clear reset state
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken(null);
      
      // Auto sign in with the new password
      // The auth context will handle the redirect
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Could not reset password');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col px-6 pb-8 pt-8">
        {/* Fixed top section - logo, toggle, title, sublabel */}
        <div className="flex-shrink-0 flex flex-col items-center pt-8">
          <div className="w-full max-w-md">
            {/* Full Logo - 75% of toggle width, centered with equal spacing above and below */}
            <div className="flex justify-center mb-[84px]">
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
                className="absolute top-1 bottom-1 rounded-full bg-white border-2 border-black z-0"
                initial={false}
                animate={{
                  left: mode === 'signup' ? '2px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)',
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
                  "relative flex-1 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ease-in-out z-10",
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
                  "relative flex-1 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ease-in-out z-10",
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
          </div>
        </div>

        {/* Scrollable content area - form expands here */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto min-h-0">
          <div className="w-full max-w-md">

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
              {/* Social buttons - always rendered, fade out when email form is shown */}
              <motion.div
                initial={false}
                animate={{
                  opacity: showEmailForm ? 0 : 1,
                  height: showEmailForm ? 0 : 'auto',
                  marginBottom: showEmailForm ? 0 : undefined,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-4 overflow-hidden"
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

              {/* Email form - slides down from below */}
              <AnimatePresence>
                {showEmailForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {/* Reset password form - shown when token is present */}
                      {showResetPassword ? (
                        <motion.div
                          key="reset-password"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <form
                            onSubmit={handleResetPassword}
                            className="space-y-4 pt-4"
                          >
                            {formError && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-xs text-red-600">{formError}</p>
                              </div>
                            )}

                            <div className="text-center mb-2">
                              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                Reset Your Password
                              </h2>
                              <p className="text-sm text-slate-600">
                                Enter your new password below.
                              </p>
                            </div>

                            <div className="relative">
                              <Input
                                id="new_password"
                                type={showNewPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => {
                                  setNewPassword(e.target.value);
                                  setFormError(null);
                                }}
                                className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 pr-10"
                                required
                                minLength={8}
                                disabled={loadingProvider === 'reset'}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                tabIndex={-1}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>

                            <div className="relative">
                              <Input
                                id="confirm_password"
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value);
                                  setFormError(null);
                                }}
                                className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 pr-10"
                                required
                                minLength={8}
                                disabled={loadingProvider === 'reset'}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                tabIndex={-1}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-[58px] rounded-xl border-slate-200 !text-slate-900 hover:bg-slate-50 hover:!text-slate-900"
                                onClick={resetForm}
                                disabled={loadingProvider === 'reset'}
                              >
                                <span className="text-[15px] font-medium !text-slate-900">Cancel</span>
                              </Button>
                              <Button
                                type="submit"
                                disabled={loadingProvider === 'reset'}
                                className="flex-1 h-[58px] rounded-xl bg-black text-white hover:bg-black/90"
                              >
                                {loadingProvider === 'reset' ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-[15px] font-medium">Resetting password…</span>
                                  </>
                                ) : (
                                  <span className="text-[15px] font-medium">Reset Password</span>
                                )}
                              </Button>
                            </div>
                          </form>
                        </motion.div>
                      ) : showForgotPassword && !isSignup ? (
                        /* Forgot password form - replaces login form */
                        <motion.div
                          key="forgot-password"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <form
                            onSubmit={handleForgotPassword}
                            className="space-y-4 pt-4"
                          >
                            {formError && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-xs text-red-600">{formError}</p>
                              </div>
                            )}

                            <div className="text-center mb-2">
                              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                                Reset Password
                              </h2>
                              <p className="text-sm text-slate-600">
                                Enter your email and we'll send you reset instructions.
                              </p>
                            </div>

                            <Input
                              id="reset_email"
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="Email"
                              value={resetEmail}
                              onChange={(e) => {
                                setResetEmail(e.target.value);
                                setFormError(null);
                              }}
                              className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0"
                              required
                              disabled={loadingProvider === 'forgot'}
                            />

                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-[58px] rounded-xl border-slate-200 !text-slate-900 hover:bg-slate-50 hover:!text-slate-900"
                                onClick={() => {
                                  setShowForgotPassword(false);
                                  setResetEmail('');
                                  setFormError(null);
                                }}
                                disabled={loadingProvider === 'forgot'}
                              >
                                <span className="text-[15px] font-medium !text-slate-900">Cancel</span>
                              </Button>
                              <Button
                                type="submit"
                                disabled={loadingProvider === 'forgot'}
                                className="flex-1 h-[58px] rounded-xl bg-black text-white hover:bg-black/90"
                              >
                                {loadingProvider === 'forgot' ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-[15px] font-medium">Sending…</span>
                                  </>
                                ) : (
                                  <span className="text-[15px] font-medium">Send Reset Link</span>
                                )}
                              </Button>
                            </div>
                          </form>
                        </motion.div>
                      ) : (
                        /* Regular login/signup form */
                        <motion.div
                          key="login-signup"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <form
                            onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn}
                            className="space-y-4 pt-4"
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
                              <div className="relative">
                                <Input
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                                  placeholder="Password"
                                  value={password}
                                  onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFormError(null);
                                  }}
                                  className="text-base border-slate-200 focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 pr-10"
                                  required
                                  minLength={isSignup ? 8 : undefined}
                                  disabled={loadingProvider === 'email'}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  tabIndex={-1}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                  ) : (
                                    <Eye className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                              {/* Forgot password link - only for signin */}
                              {!isSignup && (
                                <div className="text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowForgotPassword(true);
                                      setFormError(null);
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom: terms copy */}
        <div className="flex-shrink-0 mt-4">
          <p className="text-[11px] text-center text-slate-400 leading-snug">
            By continuing, you agree to Benjamin's <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
