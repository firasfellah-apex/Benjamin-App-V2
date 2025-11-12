/**
 * CustomerBottomNav Component
 * 
 * Fixed bottom navigation for customer app with single primary CTA.
 * Features:
 * - Single full-width "Request Cash" button
 * - Fixed positioning with safe-area-aware container
 * - Only renders on customer routes (NOT in request flow)
 * - Hidden when customer has an active order
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/db/supabase';
import { RequestCashStepperNav } from '@/components/customer/RequestCashStepperNav';

export function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for active orders
  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    const checkActiveOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('customer_id', profile.id)
          .in('status', ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'])
          .limit(1);

        if (error) throw error;

        setHasActiveOrder((data?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking active orders:', error);
        setHasActiveOrder(false);
      } finally {
        setLoading(false);
      }
    };

    checkActiveOrders();

    // Subscribe to order changes
    const subscription = supabase
      .channel('customer-orders')
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

  // CustomerFlowBottomBar now handles home, request flow, and tracking
  // This component is kept for backward compatibility but should not render
  // on routes where CustomerFlowBottomBar is used
  const isHomeRoute = location.pathname === '/customer' || location.pathname === '/customer/home';
  const isRequestRoute = location.pathname.startsWith('/customer/request');
  const isTrackingRoute = location.pathname.startsWith('/customer/orders/');
  const isAddressesRoute = location.pathname === '/customer/addresses';
  
  // Hide on all routes where CustomerFlowBottomBar is used or management pages
  if (isHomeRoute || isRequestRoute || isTrackingRoute || isAddressesRoute) {
    return null;
  }

  // For other customer routes (if any), show the old nav
  // Hide if there's an active order or still loading
  if (loading || hasActiveOrder) {
    return null;
  }

  return (
    <RequestCashStepperNav
      currentStep={1}
      totalSteps={1}
      showSteps={false}
      onPrimary={() => navigate('/customer/request')}
      primaryLabel="Request Cash"
    />
  );
}

