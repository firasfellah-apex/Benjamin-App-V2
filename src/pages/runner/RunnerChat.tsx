import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderChatThread } from '@/components/chat/OrderChatThread';
import { getOrderById } from '@/db/api';
import { useOrderRealtime } from '@/hooks/useOrdersRealtime';
import type { OrderWithDetails, OrderStatus } from '@/types/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/common/Avatar';
import { getCustomerPublicProfile } from '@/lib/revealRunnerView';
import { supabase } from '@/db/supabase';

export default function RunnerChat() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      
      // If customer profile is missing, try to fetch it separately
      if (data && !data.customer && data.customer_id) {
        if (import.meta.env.DEV) {
          console.warn('[RunnerChat] Customer profile missing from order, fetching separately...');
        }
        try {
          const { data: customerProfile, error: customerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.customer_id)
            .maybeSingle();
          
          if (!customerError && customerProfile) {
            data.customer = customerProfile;
            if (import.meta.env.DEV) {
              console.log('[RunnerChat] Fetched customer profile separately:', {
                id: customerProfile.id,
                avatar_url: customerProfile.avatar_url,
              });
            }
          } else if (import.meta.env.DEV) {
            console.error('[RunnerChat] Failed to fetch customer profile:', customerError);
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[RunnerChat] Error fetching customer profile:', err);
          }
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[RunnerChat] Loaded order:', {
          orderId: data?.id,
          hasCustomer: !!data?.customer,
          hasRunner: !!data?.runner,
          customerAvatar: data?.customer?.avatar_url,
          runnerAvatar: data?.runner?.avatar_url,
        });
      }
      setOrder(data);
    } catch (error) {
      console.error('[RunnerChat] Error loading order:', error);
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
      <div className="flex h-screen items-center justify-center bg-[#020817]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#020817]">
        <div className="text-slate-400">Order not found</div>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Get customer info for header
  const customerProfile = order.customer;
  const customerPublic = customerProfile
    ? getCustomerPublicProfile(order.status, customerProfile)
    : null;

  const customerName = customerPublic?.displayName || customerProfile?.first_name || 'Customer';
  const customerAvatar = customerPublic?.avatarUrl || customerProfile?.avatar_url;
  const customerFallback = customerProfile?.first_name || 'C';

  return (
    <div className="flex flex-col h-screen bg-[#020817]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-[#020817]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="p-2 h-auto hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-slate-300" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={customerAvatar || undefined}
            fallback={customerFallback}
            size="sm"
            className="h-10 w-10 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {customerName}
            </h1>
            {order.customer_address && (
              <p className="text-xs text-slate-400 truncate">
                {order.customer_address.split(',')[0]}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="p-2 h-auto hover:bg-slate-800"
          onClick={() => {
            // TODO: Implement call functionality
            console.log('Call customer');
          }}
        >
          <Phone className="h-5 w-5 text-slate-300" />
        </Button>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden bg-[#020817] flex flex-col">
        <div className="flex-1 overflow-hidden p-4">
          {(() => {
            if (import.meta.env.DEV) {
              console.log('[RunnerChat] Rendering OrderChatThread with:', {
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
            role="runner"
            variant="runner"
            customerProfile={order.customer || null}
          />
        </div>
      </div>
    </div>
  );
}

