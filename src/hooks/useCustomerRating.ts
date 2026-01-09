import { useQuery } from "@tanstack/react-query";
import { getCustomerRating } from "@/db/api";
import { useAuth } from "@/contexts/AuthContext";

export interface CustomerRatingResult {
  avg_rating: number | null;
  rating_count: number;
}

export function useCustomerRating() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery<CustomerRatingResult>({
    queryKey: ["customer-rating", userId],
    queryFn: async () => {
      if (!userId) {
        return { avg_rating: null, rating_count: 0 };
      }
      return await getCustomerRating(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    avg_rating: query.data?.avg_rating ?? null,
    rating_count: query.data?.rating_count ?? 0,
  };
}

