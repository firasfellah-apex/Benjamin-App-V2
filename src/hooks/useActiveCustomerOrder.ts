/**
 * useActiveCustomerOrder Hook
 * 
 * Checks if the current customer has an active order in progress.
 * An active order is one that is not in a terminal state (Completed or Cancelled).
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const ACTIVE_STATUSES = ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];

export function useActiveCustomerOrder() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setIsLoading(false);
      setHasActiveOrder(false);
      return;
    }

    const checkActiveOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('customer_id', profile.id)
          .in('status', ACTIVE_STATUSES)
          .is('cancelled_at', null) // Exclude cancelled orders
          .limit(1);

        if (error) throw error;

        setHasActiveOrder((data?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking active orders:', error);
        setHasActiveOrder(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveOrders();

    // Subscribe to order changes
    const subscription = supabase
      .channel(`customer-active-orders-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${profile.id}`,
        },
        () => {
          checkActiveOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  return { hasActiveOrder, isLoading };
}

