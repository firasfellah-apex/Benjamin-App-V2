import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface RequireAuthProps {
  children: ReactNode;
  whitelist?: string[];
}

function shouldOnboard(profile: any): boolean {
  if (!profile) return true;
  // Phone is optional, only require first_name and last_name
  return !profile.first_name || !profile.last_name;
}

function shouldPersonalize(profile: any): boolean {
  if (!profile) return false;
  // Check if personalization is incomplete
  // All three fields should be non-null to be considered complete
  return profile.usual_withdrawal_amount === null || 
         profile.preferred_handoff_style === null || 
         profile.cash_usage_categories === null;
}

export const RequireAuth = ({ children, whitelist = [] }: RequireAuthProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { profile, isReady } = useProfile(user?.id);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen text-sm text-slate-500">Loading...</div>;
  }

  // Check if current path is whitelisted
  const isWhitelisted = whitelist.some(path => location.pathname === path || location.pathname.startsWith(path));
  const isProfileOnboardingPath = location.pathname === '/onboarding/profile';
  const isPersonalizeOnboardingPath = location.pathname === '/customer/onboarding/personalize';
  const isBankOnboardingPath = location.pathname === '/customer/onboarding/bank';

  // If whitelisted, render children
  if (isWhitelisted) {
    return <>{children}</>;
  }

  // If not authenticated and not whitelisted - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated and profile is ready, check if onboarding is needed
  // Only require onboarding for customer users, not runners
  const isCustomer = profile?.role?.includes('customer') && !profile?.role?.includes('admin');
  const needsProfileOnboarding = isReady && user && shouldOnboard(profile) && isCustomer;
  const needsPersonalization = isReady && user && !shouldOnboard(profile) && shouldPersonalize(profile) && isCustomer;
  
  // If customer needs profile onboarding and not on profile onboarding path, redirect
  if (needsProfileOnboarding && !isProfileOnboardingPath && !isPersonalizeOnboardingPath) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  // If customer needs personalization and not on personalization path, redirect
  if (needsPersonalization && !isPersonalizeOnboardingPath && !isProfileOnboardingPath) {
    return <Navigate to="/customer/onboarding/personalize" replace />;
  }

  // If on profile onboarding path but profile is complete, redirect to personalization or home
  // Also redirect non-customers away from onboarding
  if (isProfileOnboardingPath) {
    if (isReady && user && profile && (!shouldOnboard(profile) || !isCustomer)) {
      // Redirect based on user role
      if (profile.role?.includes('admin')) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (profile.role?.includes('runner')) {
        return <Navigate to="/runner/work" replace />;
      } else {
        // Customer with complete profile - check if personalization is needed
        if (shouldPersonalize(profile)) {
          return <Navigate to="/customer/onboarding/personalize" replace />;
        }
        return <Navigate to="/customer/home" replace />;
      }
    }
  }

  // If on personalization path but already personalized, redirect to home
  // Also redirect non-customers away from onboarding
  if (isPersonalizeOnboardingPath) {
    if (isReady && user && profile) {
      if (!isCustomer) {
        // Redirect non-customers based on role
        if (profile.role?.includes('admin')) {
          return <Navigate to="/admin/dashboard" replace />;
        } else if (profile.role?.includes('runner')) {
          return <Navigate to="/runner/work" replace />;
        }
      } else if (!shouldPersonalize(profile)) {
        // Already personalized, go to home
        return <Navigate to="/customer/home" replace />;
      } else if (shouldOnboard(profile)) {
        // Profile not complete, go to profile onboarding first
        return <Navigate to="/onboarding/profile" replace />;
      }
    }
  }

  // Bank onboarding path: allow access if profile is complete (even if bank not connected)
  // Only redirect non-customers away
  if (isBankOnboardingPath) {
    if (isReady && user && profile && !isCustomer) {
      // Redirect non-customers based on role
      if (profile.role?.includes('admin')) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (profile.role?.includes('runner')) {
        return <Navigate to="/runner/work" replace />;
      }
    }
    // If customer needs profile onboarding, redirect to profile onboarding first
    if (needsProfileOnboarding) {
      return <Navigate to="/onboarding/profile" replace />;
    }
    // If customer needs personalization, redirect to personalization first
    if (needsPersonalization) {
      return <Navigate to="/customer/onboarding/personalize" replace />;
    }
  }

  // Authenticated - render children
  return <>{children}</>;
};

