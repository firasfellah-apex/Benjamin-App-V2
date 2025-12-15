import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';
import { useEffect } from 'react';
import { checkAndResetDailyUsage } from '@/db/api';

const LS_KEY = 'benjamin:profile:v1';

export function useProfile(userId?: string) {
  const enabled = !!userId;
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['profile', userId],
    enabled,
    // Reduced staleTime to 30 seconds for critical fields like bank connection
    // This ensures fresh data is fetched more frequently
    staleTime: 30 * 1000,
    // Refetch on window focus to catch changes from other tabs/windows
    refetchOnWindowFocus: true,
    // Refetch on mount to ensure fresh data
    refetchOnMount: true,
    initialData: () => {
      try {
        const cached = localStorage.getItem(LS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // If cached data is missing new fields, don't use it (force fresh fetch)
          // This ensures we get bank_institution_name and bank_institution_logo_url
          if (parsed && typeof parsed === 'object') {
            // Check if this looks like old cached data without institution fields
            // If plaid_item_id exists but bank_institution_name is missing, it's stale
            if (parsed.plaid_item_id && parsed.bank_institution_name === undefined) {
              console.log('[useProfile] Cached data missing institution fields, forcing fresh fetch');
              return undefined; // Force fresh fetch
            }
          }
          return parsed;
        }
      } catch {
        // Ignore parse errors
      }
      return undefined;
    },
    queryFn: async () => {
      if (!userId) return null;
      
      // Check and reset daily usage if it's a new day
      await checkAndResetDailyUsage(userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile | null;
    },
  });

  // Update localStorage when profile data changes
  // Using useEffect instead of deprecated onSuccess
  useEffect(() => {
    try {
      if (q.data) {
        localStorage.setItem(LS_KEY, JSON.stringify(q.data));
      } else if (q.data === null) {
        localStorage.removeItem(LS_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [q.data]);

  // Subscribe to realtime profile updates
  // This ensures UI updates immediately when profile changes (e.g., bank disconnection)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useProfile] Realtime update received:', payload.new);
          // Update the query cache with fresh data
          queryClient.setQueryData(['profile', userId], payload.new as Profile);
          // Also update localStorage
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(payload.new));
          } catch {
            // Ignore storage errors
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    profile: q.data as Profile | null,
    isReady: enabled ? !q.isLoading && !!q.data : false,
    ...q,
  };
}

/**
 * Helper function to clear profile cache
 * Call this when disconnecting bank or making critical profile changes
 */
export function clearProfileCache() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // Ignore errors
  }
}









