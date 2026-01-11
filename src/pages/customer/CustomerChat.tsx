import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { OrderChatThread } from '@/components/chat/OrderChatThread';
import { getOrderById } from '@/db/api';
import { useOrderRealtime } from '@/hooks/useOrdersRealtime';
import type { OrderWithDetails } from '@/types/types';
import { Avatar } from '@/components/common/Avatar';
import { getCustomerPublicProfile } from '@/lib/revealRunnerView';
import { supabase } from '@/db/supabase';

export default function CustomerChat() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if we came from fullscreen mode
  const fromFullscreen = (location.state as { fromFullscreen?: boolean } | null)?.fromFullscreen ?? false;
  
  // Navigate back to order tracking, restoring fullscreen if needed
  const handleBack = () => {
    if (orderId) {
      navigate(`/customer/deliveries/${orderId}`, { 
        state: { restoreFullscreen: fromFullscreen },
        replace: true // Replace to avoid building up history
      });
    } else {
      navigate(-1);
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      
      // If runner profile is missing, try to fetch it separately
      if (data && !data.runner && data.runner_id) {
        if (import.meta.env.DEV) {
          console.warn('[CustomerChat] Runner profile missing from order, fetching separately...');
        }
        try {
          const { data: runnerProfile, error: runnerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.runner_id)
            .maybeSingle();
          
          if (!runnerError && runnerProfile) {
            data.runner = runnerProfile;
            if (import.meta.env.DEV) {
              console.log('[CustomerChat] Fetched runner profile separately:', {
                id: runnerProfile.id,
                avatar_url: runnerProfile.avatar_url,
              });
            }
          } else if (import.meta.env.DEV) {
            console.error('[CustomerChat] Failed to fetch runner profile:', runnerError);
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[CustomerChat] Error fetching runner profile:', err);
          }
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[CustomerChat] Loaded order:', {
          orderId: data?.id,
          hasCustomer: !!data?.customer,
          hasRunner: !!data?.runner,
          customerAvatar: data?.customer?.avatar_url,
          runnerAvatar: data?.runner?.avatar_url,
        });
      }
      setOrder(data);
    } catch (error) {
      console.error('[CustomerChat] Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  // Subscribe to realtime updates
  useOrderRealtime(orderId, {
    onUpdate: (updatedOrder) => {
      if (updatedOrder.id === orderId) {
        setOrder((prev) => {
          if (!prev) return null;
          // Preserve customer and runner profiles when updating
          return {
            ...prev,
            ...updatedOrder,
            customer: prev.customer, // Preserve existing customer profile
            runner: prev.runner, // Preserve existing runner profile
          } as OrderWithDetails;
        });
      }
    },
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="text-slate-500">Order not found</div>
        <Button onClick={handleBack}>Go Back</Button>
      </div>
    );
  }

  // Get runner info for header
  const runnerProfile = order.runner;
  const runnerPublic = runnerProfile 
    ? getCustomerPublicProfile(order.status, runnerProfile as any)
    : null;

  const runnerName = runnerPublic?.displayName || runnerProfile?.first_name || 'Runner';
  const runnerAvatar = runnerPublic?.avatarUrl || runnerProfile?.avatar_url;
  const runnerFallback = runnerProfile?.first_name || 'R';

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Fixed Header - stays at top, never scrolls */}
      <div 
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0 z-50" 
        style={{ 
          paddingTop: `max(12px, env(safe-area-inset-top, 0px))`,
        }}
      >
        <IconButton
          onClick={handleBack}
          size="lg"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-slate-900" />
        </IconButton>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={runnerAvatar || undefined}
            fallback={runnerFallback}
            size="sm"
            className="h-10 w-10 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {runnerName}
            </h1>
            {order.runner && (
              <p className="text-xs text-slate-500 truncate">
                {order.runner.fun_fact || 'Benjamin Runner'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Content - scrolls beneath fixed header, adjusts for keyboard */}
      <div 
        className="flex-1 overflow-hidden bg-slate-50 flex flex-col min-h-0"
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          {(() => {
            if (import.meta.env.DEV) {
              console.log('[CustomerChat] Rendering OrderChatThread with:', {
                orderId: order.id,
                hasCustomer: !!order.customer,
                hasRunner: !!order.runner,
                customerData: order.customer ? { id: order.customer.id, avatar_url: order.customer.avatar_url } : null,
                runnerData: order.runner ? { id: order.runner.id, avatar_url: order.runner.avatar_url } : null,
              });
            }
            return null;
          })()}
          <OrderChatThread
            orderId={order.id}
            orderStatus={order.status}
            role="customer"
            variant="customer"
            runnerProfile={order.runner || null}
          />
        </div>
      </div>
    </div>
  );
}

