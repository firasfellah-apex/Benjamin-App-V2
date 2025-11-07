/**
 * Customer Home Dashboard
 * 
 * Main landing page for authenticated customers.
 * Features:
 * - Personalized greeting
 * - Delivery statistics snapshot
 * - Active order tracking card
 * - Recent order history
 * - Referral banner
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { ShellCard } from '@/components/ui/ShellCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import type { Order } from '@/types/types';
import { ArrowRight, TrendingUp, Package, Share2 } from 'lucide-react';

export default function CustomerHome() {
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileLoading && profile) {
      fetchOrders();
    }
  }, [profile, profileLoading]);

  const fetchOrders = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const orderList = data || [];
      setOrders(orderList);

      // Find active order (non-final status)
      const active = orderList.find(
        o => !['Completed', 'Cancelled'].includes(o.status)
      );
      setActiveOrder(active || null);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalDelivered = completedOrders.reduce((sum, o) => sum + o.requested_amount, 0);
  const recentOrders = orders.slice(0, 3);

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-black">
          {getGreeting()}, {profile?.first_name || 'there'}
        </h1>
        <p className="text-sm text-neutral-500">
          All your cash deliveries in one place
        </p>
      </div>

      {/* Snapshot Card */}
      <ShellCard variant="customer">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neutral-600" />
            <h2 className="text-lg font-semibold text-black">Your Summary</h2>
          </div>
          
          {completedOrders.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">Total Delivered</p>
                <p className="text-2xl font-bold text-black">
                  ${totalDelivered.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">Completed Deliveries</p>
                <p className="text-2xl font-bold text-black">
                  {completedOrders.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Package className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">
                Your summary appears after your first delivery
              </p>
            </div>
          )}
        </div>
      </ShellCard>

      {/* Active Order Card */}
      {activeOrder && (
        <ShellCard variant="customer">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Active Delivery</h2>
              <StatusChip status={activeOrder.status} tone="customer" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Amount</span>
                <span className="font-semibold text-black">
                  ${activeOrder.requested_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Order ID</span>
                <span className="font-mono text-xs text-neutral-600">
                  #{activeOrder.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/customer/orders/${activeOrder.id}`)}
              className="w-full bg-black text-white hover:bg-black/90 rounded-full"
            >
              Track Delivery
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </ShellCard>
      )}

      {/* Recent Orders */}
      <ShellCard variant="customer">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Recent Deliveries</h2>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/customer/orders/${order.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex-1 text-left space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">
                        ${order.requested_amount.toFixed(2)}
                      </span>
                      <StatusChip 
                        status={order.status} 
                        tone="customer"
                        className="text-[9px] px-2 py-0.5"
                      />
                    </div>
                    <p className="text-xs text-neutral-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Package className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">
                You haven't used Benjamin yet
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Your completed deliveries will show here
              </p>
            </div>
          )}

          {recentOrders.length > 0 && (
            <Button
              variant="outline"
              onClick={() => navigate('/customer/orders')}
              className="w-full rounded-full border-black/10 hover:bg-neutral-50"
            >
              View All Orders
            </Button>
          )}
        </div>
      </ShellCard>

      {/* Referral Banner */}
      <ShellCard variant="customer" className="bg-black text-white border-black">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">Invite a Friend</h3>
              <p className="text-xs text-white/70">
                Earn a reward once they complete their first delivery
              </p>
            </div>
          </div>
          <Button
            onClick={() => console.log('Share invite - coming soon')}
            variant="outline"
            className="w-full rounded-full bg-white text-black hover:bg-white/90 border-white"
          >
            Share Invite
          </Button>
        </div>
      </ShellCard>
    </div>
  );
}
