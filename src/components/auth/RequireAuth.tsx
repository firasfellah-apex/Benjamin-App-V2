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
  
  // If customer needs profile onboarding and not on profile onboarding path, redirect
  if (needsProfileOnboarding && !isProfileOnboardingPath) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  // If on profile onboarding path but profile is complete, redirect to bank onboarding or home
  // Also redirect non-customers away from onboarding
  if (isProfileOnboardingPath) {
    if (isReady && user && profile && (!shouldOnboard(profile) || !isCustomer)) {
      // Redirect based on user role
      if (profile.role?.includes('admin')) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (profile.role?.includes('runner')) {
        return <Navigate to="/runner/work" replace />;
      } else {
        // Customer with complete profile - allow them to proceed to bank onboarding or home
        // Don't redirect here, let them access the page if they navigate to it manually
        // But if they're already here and profile is complete, they should go to bank onboarding
        return <Navigate to="/customer/onboarding/bank" replace />;
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
  }

  // Authenticated - render children
  return <>{children}</>;
};

