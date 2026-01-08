import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile as useProfileHook } from "@/hooks/useProfile";
import { queryClient } from "@/lib/queryClient";
import { setSentryUser } from "@/lib/sentry";
import type { Profile, UserRole } from "@/types/types";

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isRunner: boolean;
  isCustomer: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, isLoading, isReady } = useProfileHook(user?.id);

  const hasRole = (role: UserRole): boolean => {
    return profile?.role?.includes(role) || false;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      // Invalidate and refetch profile
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
  };

  // Update Sentry user context when profile loads
  useEffect(() => {
    if (user && profile) {
      setSentryUser({
        id: user.id,
        email: user.email,
        role: profile.role || [],
      });
    }
  }, [user, profile]);

  const value: ProfileContextType = useMemo(() => ({
    profile,
    loading: !isReady,
    hasRole,
    isAdmin: hasRole('admin'),
    isRunner: hasRole('runner'),
    isCustomer: hasRole('customer'),
    refreshProfile
  }), [profile, isReady, hasRole]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// Re-export the hook from ProfileContext for backward compatibility
// Components should use hooks/useProfile.ts directly for new code
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
