/**
 * RoleBasedLayout Component
 * 
 * Wrapper that determines which layout to use based on user role.
 * Used for shared pages like Account that need to adapt to the user's role.
 */

import { useProfile } from "@/contexts/ProfileContext";
import { CustomerLayout } from "./CustomerLayout";
import { RunnerLayout } from "./RunnerLayout";
import { AdminLayout } from "./AdminLayout";

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { profile } = useProfile();

  // Determine layout based on primary role
  if (profile?.role.includes('admin')) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (profile?.role.includes('runner')) {
    return <RunnerLayout>{children}</RunnerLayout>;
  }

  // Default to customer layout
  return <CustomerLayout>{children}</CustomerLayout>;
}









