/**
 * Customer Home Dashboard
 * 
 * Main landing page for authenticated customers.
 * Uses CustomerScreen with 3-zone layout: header, map, footer.
 */

import { Navigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { CustomerScreen } from '@/pages/customer/components/CustomerScreen';
import { CustomerTopShell } from '@/pages/customer/components/CustomerTopShell';
import { CustomerMapViewport } from '@/components/customer/layout/CustomerMapViewport';
import { RequestFlowBottomBar } from '@/components/customer/RequestFlowBottomBar';
import { LastDeliveryCard } from '@/components/customer/LastDeliveryCard';
import { useLocation } from '@/contexts/LocationContext';
import { getCustomerOrders } from '@/db/api';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrderWithDetails, Order } from '@/types/types';

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const navigate = useNavigate();
  const { location } = useLocation();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // Load orders function
  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrdersLoading(false);
      return;
    }
    
    setOrdersLoading(true);
    try {
      const data = await getCustomerOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);
  
  // Fetch orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle realtime order updates
  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    console.log('[CustomerHome] Order update received:', updatedOrder.id, updatedOrder.status);
    
    // Update the order in the list
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
      
      if (existingIndex >= 0) {
        // Update existing order
        return prev.map((o) => 
          o.id === updatedOrder.id 
            ? { ...o, ...updatedOrder } as OrderWithDetails
            : o
        );
      } else {
        // New order, reload to get full details
        loadOrders();
        return prev;
      }
    });
  }, [loadOrders]);

  // Subscribe to realtime updates for customer orders
  useOrdersRealtime({
    filter: { mode: 'customer', customerId: user?.id || '' },
    onUpdate: handleOrderUpdate,
    onInsert: handleOrderUpdate,
    enabled: !!user?.id,
  });
  
  // Determine order states
  const { hasActiveOrder, lastCompletedOrder } = useMemo(() => {
    const activeStatuses = ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];
    const activeOrders = orders.filter(order => activeStatuses.includes(order.status));
    // Only get completed orders (exclude cancelled)
    const completedOrders = orders.filter(order => 
      order.status === 'Completed'
    );
    
    // Sort completed orders by completion date (most recent first)
    const sortedCompleted = completedOrders.sort((a, b) => {
      const dateA = a.handoff_completed_at ? new Date(a.handoff_completed_at).getTime() : new Date(a.updated_at).getTime();
      const dateB = b.handoff_completed_at ? new Date(b.handoff_completed_at).getTime() : new Date(b.updated_at).getTime();
      return dateB - dateA;
    });
    
    return {
      hasActiveOrder: activeOrders.length > 0,
      lastCompletedOrder: sortedCompleted.length > 0 ? sortedCompleted[0] : null,
    };
  }, [orders]);
  
  // Handle rate runner action
  const handleRateRunner = useCallback((orderId: string) => {
    // Navigate to order detail page where rating can be done
    navigate(`/customer/orders/${orderId}`);
  }, [navigate]);
  
  // Handle view all action
  const handleViewAll = useCallback(() => {
    navigate('/customer/history');
  }, [navigate]);

  /**
   * Format and capitalize a name, filtering out invalid IDs
   * @param name - The name to format (first_name, full_name, or email prefix)
   * @returns Formatted name or empty string if invalid
   */
  const formatName = (name?: string | null): string => {
    if (!name) return "";

    const clean = name.trim();
    if (!/^[a-zA-Z]/.test(clean)) return "";

    return clean
      .split(" ")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      )
      .join(" ");
  };

  /**
   * Get user's display name with proper formatting
   * Uses cached profile data to prevent flicker
   * @returns Formatted name or empty string if not available/invalid
   */
  const getUserName = (): string => {
    // Use profile data (cached from localStorage initially)
    if (profile?.first_name) {
      const formatted = formatName(profile.first_name);
      if (formatted) return formatted;
    }
    
    // Fallback: construct name from first_name and last_name
    if (profile?.first_name || profile?.last_name) {
      const parts = [profile.first_name, profile.last_name].filter(Boolean);
      if (parts.length > 0) {
        const fullName = parts.join(' ');
        const formatted = formatName(fullName);
        if (formatted) return formatted;
      }
    }

    // Return empty string if profile not loaded yet
    return "";
  };

  const getGreetingTime = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    return "evening";
  };

  // Reserve header height to prevent layout shift
  // Show skeleton in title slot while loading, but keep layout stable
  const displayName = getUserName();

  // Determine what to show in topContent
  // Show skeleton while orders are loading to maintain consistent header height
  // IMPORTANT: This hook must be called before any early returns to follow Rules of Hooks
  const topContent = useMemo(() => {
    const hasOrders = orders.length > 0;
    
    // If user has >= 1 order, show skeleton while loading (but not during initial auth/profile load)
    // If orders.length === 0, show nothing (keep current logic - don't change)
    if (hasOrders && ordersLoading && !authLoading && isReady) {
      return (
        <div className="mt-3">
          <div className="w-full rounded-2xl bg-white border border-gray-200 px-6 py-5 flex flex-col gap-2">
            {/* Header skeleton - matches LastDeliveryCard structure */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <Skeleton className="h-[11px] w-24" />
                <Skeleton className="h-[15px] w-48" />
                <Skeleton className="h-[11px] w-32" />
              </div>
              {/* Status pill skeleton */}
              <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
            </div>
            {/* Divider skeleton */}
            <div className="border-t border-slate-200 mt-3 mb-3" />
            {/* Actions skeleton */}
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      );
    }
    
    // Show actual card if we have a completed order and no active order
    if (!hasActiveOrder && lastCompletedOrder) {
      return (
        <LastDeliveryCard
          order={lastCompletedOrder}
          onRateRunner={handleRateRunner}
          onViewAll={handleViewAll}
        />
      );
    }
    
    // Otherwise, no top content (orders.length === 0 or other cases)
    return undefined;
  }, [orders.length, ordersLoading, authLoading, isReady, hasActiveOrder, lastCompletedOrder, handleRateRunner, handleViewAll]);

  // Show skeleton loader while auth is loading or profile is not ready
  if (authLoading || (user && !isReady)) {
    return (
      <CustomerScreen
        header={
          <div className="px-8 pt-10 pb-8">
            {/* Logo + menu skeleton */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
            
            {/* Title skeleton */}
            <div className="space-y-2 mb-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
            
            {/* Last Delivery Card Skeleton */}
            <div className="mt-6">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 flex-1 rounded-full" />
                  <Skeleton className="h-10 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        }
        map={<CustomerMapViewport center={location} />}
        footer={
          <RequestFlowBottomBar
            mode="home"
            onPrimary={() => navigate('/customer/request')}
            useFixedPosition={true}
          />
        }
      />
    );
  }

  // If no user, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <CustomerScreen
      header={
        <CustomerTopShell
          title={
            !isReady ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              `Good ${getGreetingTime()}${displayName ? `, ${displayName}` : ""}`
            )
          }
          subtitle="Skip the ATM. Request cash in seconds."
          topContent={topContent}
        />
      }
      map={<CustomerMapViewport center={location} />}
      footer={
        <RequestFlowBottomBar
          mode="home"
          onPrimary={() => navigate('/customer/request')}
          useFixedPosition={true}
        />
      }
    />
  );
}
