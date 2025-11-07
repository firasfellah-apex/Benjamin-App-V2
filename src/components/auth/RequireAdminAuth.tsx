/**
 * RequireAdminAuth Component
 * 
 * Auth guard for admin routes that:
 * - Whitelists specific admin emails
 * - Allows mock accounts in non-production
 * - Redirects non-admins to customer home instead of login loop
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'miaoda-auth-react';
import { useProfile } from '@/contexts/ProfileContext';

const ADMIN_EMAILS = ['firasfellah@gmail.com'];

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  // Explicit admins
  if (ADMIN_EMAILS.includes(email)) return true;

  // Allow any mock accounts in dev/preview environments
  if (import.meta.env.VITE_ENV !== 'production' && email.includes('mock')) {
    return true;
  }

  return false;
}

interface RequireAdminAuthProps {
  children: React.ReactNode;
}

export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const location = useLocation();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is admin by email whitelist OR profile role
  const isAdminByEmail = isAdminEmail(user.email);
  const isAdminByRole = profile?.role?.includes('admin');

  if (!isAdminByEmail && !isAdminByRole) {
    // Non-admins should go to customer home instead of being stuck in a loop
    return <Navigate to="/customer/home" replace />;
  }

  return <>{children}</>;
}
