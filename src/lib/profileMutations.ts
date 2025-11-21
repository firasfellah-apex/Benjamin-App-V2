import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/db/supabase';

const LS_KEY = 'benjamin:profile:v1';

export async function saveProfile(userId: string, patch: Partial<{
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  fun_fact: string | null;
}>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Optimistically update React Query cache and localStorage
  queryClient.setQueryData(['profile', userId], (prev: any) => {
    const next = { ...(prev || {}), ...patch };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    return next;
  });

  return data;
}

