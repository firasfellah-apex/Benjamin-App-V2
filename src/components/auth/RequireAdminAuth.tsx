import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAdminAuthProps {
  children: ReactNode;
}

export const RequireAdminAuth = ({ children }: RequireAdminAuthProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-sm text-slate-500">Loading...</div>;
  }

  const email = user?.email?.toLowerCase() ?? '';
  const isAdmin = email === 'firasfellah@gmail.com' || email.includes('mock');

  if (!isAdmin) {
    return <Navigate to="/customer/home" replace />;
  }

  return <>{children}</>;
};
