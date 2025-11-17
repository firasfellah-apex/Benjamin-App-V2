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
import { RequestFlowBottomBar } from '@/components/customer/RequestFlowBottomBar';
import { TrustCarousel } from '@/components/customer/TrustCarousel';
import { LastDeliveryCard } from '@/components/customer/LastDeliveryCard';
import { useLocation } from '@/contexts/LocationContext';
import { getCustomerOrders } from '@/db/api';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useTopShelfTransition } from '@/features/shelf/useTopShelfTransition';
import { Skeleton } from '@/components/common/Skeleton';
import { useCustomerBottomSlot } from '@/contexts/CustomerBottomSlotContext';
import type { OrderWithDetails, Order } from '@/types/types';
import bankIllustration from '@/assets/illustrations/Bank.png';
import atmIllustration from '@/assets/illustrations/ATM.png';
import runnersIllustration from '@/assets/illustrations/Runners.png';
import {
  ShieldCheckIcon,
  KeyIcon,
  LockClosedIcon,
  BoltIcon,
  EyeSlashIcon,
  ClockIcon,
  CheckBadgeIcon,
  MapPinIcon,
  HomeIcon,
} from '@heroicons/react/24/solid';

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
    // Get completed or cancelled orders (most recent order regardless of status)
    const completedOrCancelledOrders = orders.filter(order => 
      order.status === 'Completed' || order.status === 'Cancelled'
    );
    
    // Sort by date (most recent first)
    // For completed: use handoff_completed_at or updated_at
    // For cancelled: use updated_at (when it was cancelled)
    const sortedOrders = completedOrCancelledOrders.sort((a, b) => {
      const dateA = a.status === 'Completed' && a.handoff_completed_at
        ? new Date(a.handoff_completed_at).getTime()
        : new Date(a.updated_at).getTime();
      const dateB = b.status === 'Completed' && b.handoff_completed_at
        ? new Date(b.handoff_completed_at).getTime()
        : new Date(b.updated_at).getTime();
      return dateB - dateA;
    });
    
    return {
      hasActiveOrder: activeOrders.length > 0,
      lastCompletedOrder: sortedOrders.length > 0 ? sortedOrders[0] : null,
    };
  }, [orders]);
  
  // Handle rate runner action
  const handleRateRunner = useCallback((orderId: string) => {
    // Navigate to order detail page where rating can be done
    navigate(`/customer/deliveries/${orderId}`);
  }, [navigate]);
  
  // Handle view all action
  const handleViewAll = useCallback(() => {
    navigate('/customer/deliveries');
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

  // Memoize title separately so it doesn't re-render when orders load
  // Title should only depend on profile/auth state, not orders
  const title = useMemo(() => {
    if (!isReady) return undefined;
    return `Good ${getGreetingTime()}${displayName ? `, ${displayName}` : ""}`;
  }, [isReady, displayName]);

  // Trust carousel data
  const trustCards = [
    {
      id: 'bank-linked',
      image: bankIllustration,
      title: 'Bank-linked, OTP protected',
      bullets: [
        { text: 'Secure, bank-level encryption', icon: ShieldCheckIcon },
        { text: 'One-time verification codes for handoff', icon: KeyIcon },
        { text: 'Your cash stays protected end-to-end', icon: LockClosedIcon },
      ],
    },
    {
      id: 'no-atm-runs',
      image: atmIllustration,
      title: 'No ATM runs. No borrowing.',
      bullets: [
        { text: 'Skip the line and the walk', icon: BoltIcon },
        { text: 'Discreet, private cash delivery', icon: EyeSlashIcon },
        { text: 'Get cash exactly when you need it', icon: ClockIcon },
      ],
    },
    {
      id: 'background-checked',
      image: runnersIllustration,
      title: 'Background-checked runners',
      bullets: [
        { text: 'Every runner is vetted and verified', icon: CheckBadgeIcon },
        { text: 'Identity tracked from pickup to delivery', icon: MapPinIcon },
        { text: 'Safe, reliable handoff at your door', icon: HomeIcon },
      ],
    },
  ];

  // Determine what to show in topContent
  // Show skeleton while orders are loading to maintain consistent header height
  // IMPORTANT: This hook must be called before any early returns to follow Rules of Hooks
  const topContent = useMemo(() => {
    // Show skeleton while orders are loading (but not during initial auth/profile load)
    // This prevents flash of TrustCarousel when orders are still loading
    if (ordersLoading && !authLoading && isReady) {
      return (
        <div className="space-y-3">
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
          <div className="border-t border-slate-200" />
          {/* Actions skeleton */}
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      );
    }
    
    // Show actual card if we have a last delivery (completed or cancelled)
    // Show it even if there's an active order
    if (lastCompletedOrder) {
      return (
        <LastDeliveryCard
          order={lastCompletedOrder}
          onRateRunner={handleRateRunner}
          onViewAll={handleViewAll}
        />
      );
    }
    
    // Otherwise, show TrustCarousel when there's no last delivery and orders have finished loading
    return <TrustCarousel cards={trustCards} />;
  }, [ordersLoading, authLoading, isReady, lastCompletedOrder, handleRateRunner, handleViewAll, trustCards]);

  // If no user, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Loading state for greeting/title area - only depends on auth/profile, not orders
  // Orders loading is handled separately in topContent useMemo
  // IMPORTANT: Never include ordersLoading here - it causes title to flicker when navigating back
  const loading = authLoading || (user && !isReady);
  const shelf = useTopShelfTransition();
  const { setBottomSlot } = useCustomerBottomSlot();

  // Set bottom slot for MobilePageShell
  // Only depend on setBottomSlot (which is stable from context)
  // Create the handler inline to avoid shelf dependency
  useEffect(() => {
    setBottomSlot(
      <RequestFlowBottomBar
        mode="home"
        onPrimary={() => {
          shelf.goTo('/customer/request', 'address', 320);
        }}
        useFixedPosition={true}
      />
    );
    return () => setBottomSlot(null);
  }, [setBottomSlot]); // Only setBottomSlot - shelf is stable from hook

  return (
    <CustomerScreen
      loading={loading}
      title={title}
      subtitle="Skip the ATM. Request cash in seconds."
      stepKey="home"
      topContent={topContent}
    >
      {/* No children - TrustCarousel is in topContent when no last delivery */}
    </CustomerScreen>
  );
}
