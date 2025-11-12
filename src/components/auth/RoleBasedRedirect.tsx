/**
 * Role-Based Redirect Component
 * 
 * Redirects authenticated users to the appropriate dashboard based on their role:
 * - Admin → /admin/dashboard
 * - Runner → /runner/work
 * - Customer → /customer/home (or onboarding if profile incomplete)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

function shouldOnboard(profile: any): boolean {
  if (!profile) return true;
  return !profile.first_name || !profile.last_name;
}

export function RoleBasedRedirect() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { profile, isReady } = useProfile(user?.id);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile to be ready
  // The useProfile hook will automatically fetch the profile, so we just wait
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-500">
        Loading profile...
      </div>
    );
  }

  // Profile is ready, determine redirect based on role
  if (profile) {
    const isAdmin = profile.role?.includes('admin');
    const isRunner = profile.role?.includes('runner');
    const isCustomer = !isAdmin && !isRunner;
    
    // Check if customer needs onboarding
    if (isCustomer && shouldOnboard(profile)) {
      return <Navigate to="/onboarding/profile" replace />;
    }

    // Redirect based on role
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (isRunner) {
      return <Navigate to="/runner/work" replace />;
    } else {
      return <Navigate to="/customer/home" replace />;
    }
  }

  // No profile found, default to customer home (will trigger onboarding if needed)
  return <Navigate to="/customer/home" replace />;
}

