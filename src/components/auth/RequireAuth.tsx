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
  const isOnboardingPath = location.pathname === '/onboarding/profile';

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
  const needsOnboarding = isReady && user && shouldOnboard(profile) && isCustomer;
  
  if (needsOnboarding && !isOnboardingPath) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  // If on onboarding path but profile is complete, redirect to home
  // Also redirect non-customers away from onboarding
  if (isOnboardingPath) {
    if (isReady && user && profile && (!shouldOnboard(profile) || !isCustomer)) {
      // Redirect based on user role
      if (profile.role?.includes('admin')) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (profile.role?.includes('runner')) {
        return <Navigate to="/runner/work" replace />;
      } else {
        return <Navigate to="/customer/home" replace />;
      }
    }
  }

  // Authenticated - render children
  return <>{children}</>;
};

