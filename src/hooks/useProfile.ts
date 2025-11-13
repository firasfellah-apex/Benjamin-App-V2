import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';

const LS_KEY = 'benjamin:profile:v1';

export function useProfile(userId?: string) {
  const enabled = !!userId;

  const q = useQuery({
    queryKey: ['profile', userId],
    enabled,
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      try {
        const cached = localStorage.getItem(LS_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // Ignore parse errors
      }
      return undefined;
    },
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile | null;
    },
    onSuccess: (data) => {
      try {
        if (data) {
          localStorage.setItem(LS_KEY, JSON.stringify(data));
        } else {
          localStorage.removeItem(LS_KEY);
        }
      } catch {
        // Ignore storage errors
      }
    },
  });

  return {
    profile: q.data as Profile | null,
    isReady: enabled ? !q.isLoading && !!q.data : false,
    isLoading: q.isLoading,
    ...q,
  };
}









