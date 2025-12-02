/**
 * Customer Home Dashboard
 * 
 * Main landing page for authenticated customers.
 * Uses CustomerScreen with 3-zone layout: header, map, footer.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { CustomerScreen } from '@/pages/customer/components/CustomerScreen';
import { RequestFlowBottomBar } from '@/components/customer/RequestFlowBottomBar';
import { TrustCarousel } from '@/components/customer/TrustCarousel';
import { LastDeliveryCard } from '@/components/customer/LastDeliveryCard';
import { KycReminderCard } from '@/components/customer/KycReminderCard';
import { CompletionRatingModal } from '@/components/customer/CompletionRatingModal';
import { getCustomerOrders, hasOrderIssue } from '@/db/api';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { Skeleton } from '@/components/common/Skeleton';
import { useCustomerBottomSlot } from '@/contexts/CustomerBottomSlotContext';
import { useQueryClient } from '@tanstack/react-query';
import type { OrderWithDetails, Order } from '@/types/types';
import protectedIllustration from '@/assets/illustrations/Protected.png';
import noAtmIllustration from '@/assets/illustrations/NoATM.png';
import trustedRunnerIllustration from '@/assets/illustrations/TrustedRunner.png';

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const navigate = useNavigate();
  const location = useLocation(); // react-router location
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [orderToRate, setOrderToRate] = useState<OrderWithDetails | null>(null);
  const [ordersWithIssues, setOrdersWithIssues] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const previousLocationRef = useRef<string>('');
  
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
  
  // Reload orders when navigating back to this page (e.g., after cancellation)
  useEffect(() => {
    const currentPath = location.pathname;
    // If we just navigated to home from another page, reload orders
    if (previousLocationRef.current && previousLocationRef.current !== currentPath && currentPath === '/customer/home') {
      console.log('[CustomerHome] Navigation detected, reloading orders');
      loadOrders();
    }
    previousLocationRef.current = currentPath;
  }, [location.pathname, loadOrders]);

  // Handle realtime order updates
  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    console.log('[CustomerHome] Order update received:', updatedOrder.id, updatedOrder.status);
    
    // If order was cancelled, reload all orders to ensure consistency
    if (updatedOrder.status === 'Cancelled' || updatedOrder.cancelled_at) {
      loadOrders();
      return;
    }
    
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
  const { hasActiveOrder, activeOrder, lastCompletedOrder } = useMemo(() => {
    const activeStatuses = ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];
    // Filter for active orders, but exclude any that are cancelled (even if status is wrong)
    const activeOrders = orders.filter(order => 
      activeStatuses.includes(order.status) && 
      order.status !== 'Cancelled' &&
      !order.cancelled_at
    );
    // Sort active orders by created_at (most recent first) to get the current active order
    const sortedActiveOrders = activeOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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
      activeOrder: sortedActiveOrders.length > 0 ? sortedActiveOrders[0] : null,
      lastCompletedOrder: sortedOrders.length > 0 ? sortedOrders[0] : null,
    };
  }, [orders]);
  
  // Check for reported issues when orders load (only check completed orders without ratings)
  useEffect(() => {
    let cancelled = false;
    
    const checkOrderIssues = async () => {
      const completedOrdersWithoutRatings = orders.filter(
        order => order.status === 'Completed' && !order.runner_rating
      );
      
      if (completedOrdersWithoutRatings.length === 0) {
        setOrdersWithIssues(new Set());
        return;
      }

      const issueSet = new Set<string>();
      
      // Check issues in parallel but with reasonable batching
      const checks = completedOrdersWithoutRatings.map(async (order) => {
        if (cancelled) return;
        const hasIssue = await hasOrderIssue(order.id);
        if (hasIssue && !cancelled) {
          issueSet.add(order.id);
        }
      });

      await Promise.all(checks);
      
      if (!cancelled) {
        setOrdersWithIssues(issueSet);
      }
    };

    if (orders.length > 0 && !ordersLoading) {
      checkOrderIssues();
    }

    return () => {
      cancelled = true;
    };
  }, [orders, ordersLoading]);
  
  // Update issue status when rating modal closes (issue might have been reported)
  useEffect(() => {
    if (!ratingModalOpen && orderToRate) {
      hasOrderIssue(orderToRate.id).then(issueExists => {
        if (issueExists) {
          setOrdersWithIssues(prev => new Set([...prev, orderToRate.id]));
        }
      }).catch(() => {
        // Silently handle errors - issue check failed but don't block UI
      });
    }
  }, [ratingModalOpen, orderToRate]);

  // Handle rate runner action
  const handleRateRunner = useCallback((orderId: string) => {
    // Don't open rating modal if issue was reported
    if (ordersWithIssues.has(orderId)) {
      return;
    }
    
    // Find the order to rate
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setOrderToRate(order);
      setRatingModalOpen(true);
    }
  }, [orders, ordersWithIssues]);
  
  // Handle rating modal close
  const handleRatingModalClose = useCallback(() => {
    setRatingModalOpen(false);
    setOrderToRate(null);
  }, []);
  
  // Handle after rating is submitted
  const handleRated = useCallback(() => {
    // Refresh orders to get updated rating
    loadOrders();
    handleRatingModalClose();
  }, [loadOrders, handleRatingModalClose]);
  
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
      id: 'protected',
      image: protectedIllustration,
      title: 'Protected end-to-end.',
      body: 'Your identity and transaction stay secured with bank-grade encryption.',
      backgroundColor: '#EFE2D1', // Protected illustration background
    },
    {
      id: 'no-atm-runs',
      image: noAtmIllustration,
      title: 'No ATM runs. Ever.',
      body: 'Skip the line, skip the hassle—cash delivered privately to your door.',
      backgroundColor: '#CFE7F9', // NoATM illustration background
    },
    {
      id: 'trusted-runners',
      image: trustedRunnerIllustration,
      title: 'Only trusted runners.',
      body: 'Every runner is background-checked, verified, and tracked during delivery.',
      backgroundColor: '#C7EDC5', // TrustedRunner illustration background
    },
  ];

  // Fixed content: divider under title/subtitle (matches cash amount page pattern exactly)
  const fixedContent = useMemo(() => {
    return (
      <>
        {/* Divider under title/subtitle - 24px spacing from subtitle (fixed, doesn't scroll) */}
        <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
      </>
    );
  }, []);

  // Check if user needs KYC reminder
  const needsKycReminder = useMemo(() => {
    if (!profile || !isReady) return false;
    const isCustomer = profile.role?.includes('customer') && !profile.role?.includes('admin');
    return isCustomer && profile.kyc_status !== 'verified';
  }, [profile, isReady]);

  // Determine what to show in topContent
  // Show skeleton while orders are loading to maintain consistent header height
  // IMPORTANT: This hook must be called before any early returns to follow Rules of Hooks
  const topContent = useMemo(() => {
    const content: React.ReactNode[] = [];
    
    // Show skeleton while orders are loading (but not during initial auth/profile load)
    // This prevents flash of TrustCarousel when orders are still loading
    if (ordersLoading && !authLoading && isReady) {
      return (
        <div className="space-y-3" style={{ paddingTop: '24px' }}>
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
    
    // Show KYC reminder card if needed (before other content)
    if (needsKycReminder && !ordersLoading) {
      content.push(
        <div key="kyc-reminder" style={{ paddingTop: '24px' }}>
          <KycReminderCard
            onCompleted={async () => {
              // Profile will be refetched by the hook
              await queryClient.invalidateQueries({ queryKey: ['profile'] });
            }}
          />
        </div>
      );
    }
    
    // Show actual card if we have a last delivery (completed or cancelled)
    // Show it even if there's an active order
    if (lastCompletedOrder && !ordersLoading) {
      const topPadding = needsKycReminder ? '24px' : '24px';
      content.push(
        <div key="last-delivery" style={{ paddingTop: topPadding }}>
          <LastDeliveryCard
            order={lastCompletedOrder}
            onRateRunner={handleRateRunner}
            hasIssue={ordersWithIssues.has(lastCompletedOrder.id)}
          />
        </div>
      );
    }
    
    // Show bank connection prompt if no bank is connected (after last delivery card or KYC reminder)
    const hasBankConnection = !!profile?.plaid_item_id;
    if (!hasBankConnection && !ordersLoading && isReady) {
      const topPadding = (needsKycReminder || lastCompletedOrder) ? '24px' : '24px';
      content.push(
        <div key="bank-prompt" style={{ paddingTop: topPadding }}>
          <div className="rounded-2xl border border-[#F0F0F0] bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Connect your bank to order cash
                </h3>
                <p className="text-sm text-slate-600">
                  Link a bank account to verify your identity and start ordering cash delivered to your door.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/customer/bank-accounts')}
              className="w-full h-14 rounded-xl bg-black text-white hover:bg-black/90 font-semibold text-[15px] transition-colors"
            >
              Connect Bank Account
            </button>
          </div>
        </div>
      );
    }
    
    // Otherwise, show TrustCarousel when there's no last delivery and orders have finished loading
    if (!lastCompletedOrder && !ordersLoading) {
      const topPadding = (needsKycReminder || !hasBankConnection) ? '24px' : '24px';
      content.push(
        <div key="trust-carousel" style={{ paddingTop: topPadding }}>
          <TrustCarousel cards={trustCards} />
        </div>
      );
    }
    
    return content.length > 0 ? <>{content}</> : null;
  }, [ordersLoading, authLoading, isReady, lastCompletedOrder, handleRateRunner, trustCards, needsKycReminder, queryClient]);

  // If no user, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const { setBottomSlot } = useCustomerBottomSlot();

  // Set bottom slot for MobilePageShell
  // Show progress info and "Track Order" button when there's an active order, otherwise show "Order Cash"
  useEffect(() => {
    if (hasActiveOrder && activeOrder) {
      // Show progress info and "Track Order" button
      setBottomSlot(
        <RequestFlowBottomBar
          mode="home"
          onPrimary={() => {
            navigate(`/customer/deliveries/${activeOrder.id}`);
          }}
          useFixedPosition={true}
          activeOrder={activeOrder}
        />
      );
    } else {
      // Show "Order Cash" button (disabled if orders are loading)
      setBottomSlot(
        <RequestFlowBottomBar
          mode="home"
          onPrimary={() => {
            navigate('/customer/request');
          }}
          useFixedPosition={true}
          primaryDisabled={ordersLoading}
        />
      );
    }
    return () => setBottomSlot(null);
  }, [setBottomSlot, navigate, hasActiveOrder, activeOrder, ordersLoading]);

  // Calculate custom bottom padding based on whether there's an active order
  // When active order is shown, the bottom nav includes progress info, making it taller
  const customBottomPadding = useMemo(() => {
    if (hasActiveOrder && activeOrder) {
      // When showing active order progress, the bottom nav includes:
      // - pt-6 (24px top padding)
      // - Active order section with mb-4 (16px margin) and space-y-4 (16px spacing):
      //   * Title + Sub label (~42px: title ~24px + sublabel ~20px + 6px padding)
      //   * Progress Bar with py-3 (~42px: 12px top + bar ~18px + 12px bottom)
      //   Total for active order section: ~100px (42px + 16px + 42px)
      // - Button (56px)
      // - pb-[max(24px,env(safe-area-inset-bottom))] (24px + safe area)
      // Total: 24px + 100px + 56px + 24px + safe area = 204px + safe area
      return "calc(24px + max(24px, env(safe-area-inset-bottom)) + 204px)";
    }
    // Default bottom nav height (button + padding)
    return undefined; // Uses default in CustomerScreen
  }, [hasActiveOrder, activeOrder]);

  return (
    <>
      <CustomerScreen
        title={title}
        subtitle="Skip the ATM. Request cash in seconds."
        fixedContent={fixedContent}
        topContent={topContent}
        customBottomPadding={customBottomPadding}
      >
        {/* Show TrustCarousel below View All Deliveries, even when there's a last delivery */}
        {lastCompletedOrder && (
          <div className="space-y-6">
            <TrustCarousel cards={trustCards} />
          </div>
        )}
      </CustomerScreen>
      
      {/* Completion Rating Modal */}
      {orderToRate && !ordersWithIssues.has(orderToRate.id) && (
        <CompletionRatingModal
          order={orderToRate}
          open={ratingModalOpen}
          onClose={handleRatingModalClose}
          onRated={handleRated}
        />
      )}
    </>
  );
}

