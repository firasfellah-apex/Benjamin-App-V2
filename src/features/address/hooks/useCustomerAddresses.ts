import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomerAddresses } from "@/db/api";
import { useAuth } from "@/contexts/AuthContext";
import type { CustomerAddress } from "@/types/types";

export function useCustomerAddresses() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery<CustomerAddress[]>({
    queryKey: ["customer-addresses", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getCustomerAddresses();
    },
    enabled: !!userId,
    // Important bits to prevent flicker:
    staleTime: 5 * 60 * 1000,           // 5 minutes: treat data as fresh
    gcTime: 30 * 60 * 1000,             // keep in cache for 30 mins (was cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,              // don't reset to loading on remount
    placeholderData: (previousData) => previousData ?? [], // keep old addresses while refetching
  });

  const addresses = query.data ?? [];
  const hasAnyAddress = addresses.length > 0;

  return {
    ...query,
    addresses,
    hasAnyAddress,
  };
}

// Helper hook to get query client for mutations
export function useInvalidateAddresses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return () => {
    queryClient.invalidateQueries({ queryKey: ["customer-addresses", userId] });
  };
}

