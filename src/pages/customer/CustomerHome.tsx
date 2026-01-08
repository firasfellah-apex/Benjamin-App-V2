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
import { LastDeliveryCard } from '@/components/customer/LastDeliveryCard';
import CustomerCard from '@/pages/customer/components/CustomerCard';
import { CompletionRatingModal } from '@/components/customer/CompletionRatingModal';
import { getCustomerOrders, getOrderById, hasOrderIssue } from '@/db/api';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { Skeleton } from '@/components/common/Skeleton';
import { useCustomerBottomSlot } from '@/contexts/CustomerBottomSlotContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderWithDetails, Order } from '@/types/types';
import protectedIllustration from '@/assets/illustrations/Protected.png';
import noAtmIllustration from '@/assets/illustrations/NoATM.png';
import trustedRunnerIllustration from '@/assets/illustrations/TrustedRunner.png';
import { Button } from '@/components/ui/button';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import LottieComponent from 'lottie-react';
import bankAnimation from '@/assets/animations/bank.json';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from '@/hooks/use-toast';

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isReady } = useProfile(user?.id);
  const { hasAnyBank } = useBankAccounts();
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
  // Update both local state AND React Query cache to keep everything in sync
  const handleOrderUpdate = useCallback(async (updatedOrder: Order) => {
    console.log('[CustomerHome] Order update received:', updatedOrder.id, updatedOrder.status, 'runner_id:', updatedOrder.runner_id);
    
    // If order was cancelled, reload all orders to ensure consistency
    if (updatedOrder.status === 'Cancelled' || updatedOrder.cancelled_at) {
      loadOrders();
      return;
    }
    
    // CRITICAL: If runner was just assigned, fetch complete order data FIRST
    // This ensures we show runner name/avatar immediately instead of placeholder
    const currentCachedOrder = queryClient.getQueryData<OrderWithDetails | null>(['order', updatedOrder.id]);
    const runnerJustAssigned = (
      updatedOrder.runner_id &&
      (!currentCachedOrder?.runner_id || currentCachedOrder.runner_id !== updatedOrder.runner_id)
    );
    
    if (runnerJustAssigned) {
      console.log('[CustomerHome] Runner just assigned, fetching full order with runner data FIRST');
      try {
        const fullData = await getOrderById(updatedOrder.id);
        if (fullData) {
          console.log('[CustomerHome] Got full order with runner data:', {
            orderId: fullData.id,
            runnerFirstName: fullData.runner?.first_name || 'N/A',
          });
          // Update React Query cache with complete data
          queryClient.setQueryData(['order', updatedOrder.id], fullData);
          // Update local state with complete data
          setOrders((prev) => {
            const existingIndex = prev.findIndex((o) => o.id === fullData.id);
            if (existingIndex >= 0) {
              return prev.map((o) => o.id === fullData.id ? fullData : o);
            }
            return prev;
          });
          return; // Done - we have complete data
        }
      } catch (error) {
        console.error('[CustomerHome] Error fetching full order details:', error);
        // Fall through to update with partial data
      }
    }
    
    // Update React Query cache for this specific order (shared with OrderTracking)
    queryClient.setQueryData<OrderWithDetails | null>(['order', updatedOrder.id], (prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedOrder,
        updated_at: updatedOrder.updated_at || prev.updated_at,
      } as OrderWithDetails;
    });
    
    // Update the order in the local list
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
      if (existingIndex >= 0) {
        return prev.map((o) => 
          o.id === updatedOrder.id 
            ? { ...o, ...updatedOrder } as OrderWithDetails
            : o
        );
      } else {
        loadOrders();
        return prev;
      }
    });
    
    // Fetch full order details in background to hydrate relations
    getOrderById(updatedOrder.id).then((data) => {
      if (data) {
        queryClient.setQueryData(['order', updatedOrder.id], data);
        setOrders((prev) => {
          const existingIndex = prev.findIndex((o) => o.id === data.id);
          if (existingIndex >= 0) {
            return prev.map((o) => o.id === data.id ? data : o);
          }
          return prev;
        });
      }
    }).catch((error) => {
      console.error('[CustomerHome] Error fetching full order details:', error);
    });
  }, [loadOrders, queryClient]);

  // Subscribe to realtime updates for customer orders
  useOrdersRealtime({
    filter: { mode: 'customer', customerId: user?.id || '' },
    onUpdate: handleOrderUpdate,
    onInsert: handleOrderUpdate,
    enabled: !!user?.id,
  });
  
  // For active order, prefer React Query cache if available (shared with OrderTracking)
  // Fallback to local state if not in cache yet
  const activeOrderId = useMemo(() => {
    const activeStatuses = ['Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];
    const activeOrders = orders.filter(order => 
      activeStatuses.includes(order.status) && 
      order.status !== 'Cancelled' &&
      !order.cancelled_at
    );
    const sortedActiveOrders = activeOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedActiveOrders.length > 0 ? sortedActiveOrders[0].id : null;
  }, [orders]);

  // Use React Query to get active order (shared cache with OrderTracking)
  const { data: activeOrderFromCache } = useQuery<OrderWithDetails | null>({
    queryKey: ['order', activeOrderId],
    queryFn: async () => {
      if (!activeOrderId) return null;
      return await getOrderById(activeOrderId);
    },
    enabled: !!activeOrderId,
    staleTime: 0, // Always consider stale to allow realtime updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
    
    // Use React Query cache for active order if available, otherwise fallback to local state
    const activeOrderFromLocal = sortedActiveOrders.length > 0 ? sortedActiveOrders[0] : null;
    const activeOrder = activeOrderFromCache || activeOrderFromLocal;

    return {
      hasActiveOrder: activeOrders.length > 0,
      activeOrder,
      lastCompletedOrder: sortedOrders.length > 0 ? sortedOrders[0] : null,
    };
  }, [orders, activeOrderFromCache]);
  
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
      // Note: hasOrderIssue() checks if order_issues table exists, which may show a 404
      // in console if the table doesn't exist. This is expected and harmless - the check
      // is cached after the first attempt, so it only happens once per session.
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

  // Trust cards data
  const trustCards = [
    {
      id: 'protected',
      image: protectedIllustration,
      title: 'Protected end-to-end.',
      body: 'Your identity and transaction stay secured with bank-grade encryption.',
    },
    {
      id: 'no-atm-runs',
      image: noAtmIllustration,
      title: 'No ATM runs. Ever.',
      body: 'Skip the line, skip the hassle—cash delivered privately to your door.',
    },
    {
      id: 'trusted-runners',
      image: trustedRunnerIllustration,
      title: 'Only trusted runners.',
      body: 'Every runner is background-checked, verified, and tracked during delivery.',
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

  // Check if user has bank connected (used for bank connection prompt)
  // Use bank_accounts table instead of profile.plaid_item_id
  const hasBankConnection = hasAnyBank;

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
    
    // Show last delivery card if available
    if (lastCompletedOrder && !ordersLoading) {
      content.push(
        <div key="last-delivery" style={{ paddingTop: '24px' }}>
          <LastDeliveryCard
            order={lastCompletedOrder}
            onRateRunner={handleRateRunner}
            hasIssue={ordersWithIssues.has(lastCompletedOrder.id)}
          />
        </div>
      );
    }
    
    // Show bank connection prompt if no bank is connected
    // This is the ONLY prompt for connecting bank - shows after last delivery card or at the top
    if (!hasBankConnection && !ordersLoading && isReady) {
      const topPadding = lastCompletedOrder ? '24px' : '24px';
      content.push(
        <div key="bank-prompt" style={{ paddingTop: topPadding }}>
          <div className="w-full rounded-xl bg-white px-4 py-4">
            <div className="space-y-4">
              {/* Animated bank icon - centered */}
              <div className="flex justify-center">
                <div className="w-12 h-12 flex items-center justify-center">
                  <LottieComponent
                    animationData={bankAnimation}
                    loop={false}
                    autoplay={true}
                    style={{ width: '48px', height: '48px' }}
                  />
                </div>
              </div>
              
              {/* Header - centered */}
              <div className="flex items-center justify-center">
                <span className="text-base font-semibold text-slate-900">Connect Your Bank Account</span>
              </div>
              
              {/* Benefit bullets - centered */}
              <div className="space-y-2 flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#13F287' }} />
                  <span className="text-sm text-slate-700">Unlock cash requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#13F287' }} />
                  <span className="text-sm text-slate-700">Faster refunds & support</span>
                </div>
              </div>
              
              <Button
                type="button"
                onClick={() => navigate('/customer/banks')}
                className="w-full h-14 bg-black text-white hover:bg-black/90 font-semibold flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    // Show trust cards list when there's no last delivery
    // Show trust cards after bank prompt (if no bank) or standalone (if bank connected)
    if (!lastCompletedOrder && !ordersLoading && isReady) {
      const topPadding = !hasBankConnection ? '24px' : '24px';
      content.push(
        <div key="trust-cards" style={{ paddingTop: topPadding, margin: 0 }}>
          <div className="grid grid-cols-1 gap-3">
            {trustCards.map((card) => (
              <CustomerCard key={card.id} className="overflow-hidden px-0 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 pr-6">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{card.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{card.body}</p>
                  </div>
                </div>
              </CustomerCard>
            ))}
          </div>
        </div>
      );
    }
    
    return content.length > 0 ? <>{content}</> : null;
  }, [ordersLoading, authLoading, isReady, lastCompletedOrder, handleRateRunner, trustCards, hasBankConnection, queryClient, navigate]);

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

  // DEV-ONLY: Test push notification handler
  const handleTestPush = useCallback(async () => {
    if (!import.meta.env.DEV) {
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('No user found. Please log in.');
        return;
      }

      // Query for newest active Android token
      const { data: tokens, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', user.id)
        .eq('platform', 'android')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (tokenError) {
        console.error('[Test Push] Error querying tokens:', tokenError);
        alert(`Error: ${tokenError.message}`);
        return;
      }

      if (!tokens || tokens.length === 0) {
        alert('No android token found. Open app once on emulator to register token.');
        return;
      }

      const token = tokens[0].token;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('notify-order-event', {
        body: {
          token,
          title: 'Benjamin Test',
          body: 'Push test ✅'
        }
      });

      console.log('[Test Push] Full response:', { data, error });

      if (error) {
        alert(`Error: ${error.message || JSON.stringify(error)}`);
      } else {
        alert(`Success! Check console for full response.`);
      }
    } catch (error: any) {
      console.error('[Test Push] Unexpected error:', error);
      alert(`Unexpected error: ${error.message || 'Unknown error'}`);
    }
  }, []);

  return (
    <>
      {/* DEV-ONLY: Test Buttons */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          <Button
            onClick={handleTestPush}
            size="sm"
            variant="outline"
            className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 text-xs"
          >
            DEV: Test Push
          </Button>
          <Button
            onClick={() => {
              toast({
                title: "Toast works",
                description: "UI is rendering ✅",
                duration: 3000,
              });
            }}
            size="sm"
            variant="outline"
            className="bg-green-100 border-green-300 text-green-800 hover:bg-green-200 text-xs"
          >
            DEV: Test Toast
          </Button>
        </div>
      )}

      <CustomerScreen
        title={title}
        subtitle="Skip the ATM. Request cash in seconds."
        fixedContent={fixedContent}
        topContent={topContent}
        customBottomPadding={customBottomPadding}
      >
        {/* Show trust cards list below View All Deliveries, even when there's a last delivery */}
        {lastCompletedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {trustCards.map((card) => (
                <CustomerCard key={card.id} className="overflow-hidden px-0 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-[75px] h-[75px] flex items-center justify-center">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{card.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">{card.body}</p>
                    </div>
                  </div>
                </CustomerCard>
              ))}
            </div>
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

