import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "miaoda-auth-react";
import { getCurrentProfile } from "@/db/api";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getCurrentProfile();
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const hasRole = (role: UserRole): boolean => {
    return profile?.role?.includes(role) || false;
  };

  const value: ProfileContextType = {
    profile,
    loading,
    hasRole,
    isAdmin: hasRole('admin'),
    isRunner: hasRole('runner'),
    isCustomer: hasRole('customer'),
    refreshProfile: loadProfile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
