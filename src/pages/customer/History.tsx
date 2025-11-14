/**
 * Customer Order History Page
 * 
 * Shows all completed/delivered orders for the customer.
 * Lightweight, scalable list view focused on delivery history.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from '@/lib/icons';
import { CustomerScreen } from '@/pages/customer/components/CustomerScreen';
import CustomerCard from '@/pages/customer/components/CustomerCard';
import { getCustomerOrders } from '@/db/api';
import type { OrderWithDetails } from '@/types/types';
import { formatDate } from '@/lib/utils';
import { OrderListSkeleton } from '@/components/order/OrderListSkeleton';

/**
 * Get address label from order
 */
function getAddressLabel(order: OrderWithDetails): string {
  if (order.address_snapshot?.label) {
    return order.address_snapshot.label;
  }
  
  if (order.address_snapshot?.line1) {
    const parts = order.address_snapshot.line1.split(',');
    return parts[0] || 'Address';
  }
  
  if (order.customer_address) {
    const parts = order.customer_address.split(',');
    return parts[0] || 'Address';
  }
  
  return 'Address';
}

/**
 * Format delivery date and time
 */
function formatDeliveryDate(order: OrderWithDetails): string {
  const date = order.handoff_completed_at 
    ? new Date(order.handoff_completed_at)
    : order.created_at
    ? new Date(order.created_at)
    : new Date();
  
  // Format date: "Jan 15, 2024, 9:42 PM"
  const dateStr = formatDate(date, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${dateStr}, ${timeStr}`;
}

export default function History() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const data = await getCustomerOrders();
        setOrders(data);
      } catch (error) {
        console.error('Error loading order history:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Filter and sort orders: show only completed orders, sorted by most recent first
  const filteredOrders = useMemo(() => {
    // Filter: only show Completed orders (exclude active, cancelled, etc.)
    const completed = orders.filter(order => order.status === 'Completed');
    
    // Sort by completion date (handoff_completed_at) or created_at, most recent first
    return completed.sort((a, b) => {
      const dateA = a.handoff_completed_at 
        ? new Date(a.handoff_completed_at).getTime() 
        : new Date(a.created_at).getTime();
      const dateB = b.handoff_completed_at 
        ? new Date(b.handoff_completed_at).getTime() 
        : new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [orders]);

  const handleBack = () => {
    navigate('/customer/home');
  };

  const handleOrderClick = (order: OrderWithDetails) => {
    navigate(`/customer/deliveries/${order.id}`);
  };

  return (
    <CustomerScreen
      loading={loading}
      title="Your deliveries"
      subtitle="A record of where, when, and how much cash you've received."
      headerLeft={
        <button
          onClick={handleBack}
          className="p-2 rounded-full transition-colors -ml-2"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
      }
      map={<div className="flex flex-col h-full bg-[#F5F7FA]" />}
    >
      {loading ? (
        <div className="space-y-4">
          <OrderListSkeleton count={5} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="w-full px-6 pt-6 pb-6">
          <div className="w-full flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F4F7FB] flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">
              No deliveries yet
            </h3>
            <p className="text-sm text-slate-500 text-center max-w-[280px]">
              Your history will appear here after your first completed order.
            </p>
            <button
              onClick={() => navigate('/customer/request')}
              className="w-full rounded-full bg-black text-white text-base font-semibold active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 py-4 px-6"
            >
              Request Cash
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const addressLabel = getAddressLabel(order);
            const deliveryDate = formatDeliveryDate(order);
            const isRated = !!order.runner_rating;
            
            return (
              <CustomerCard
                key={order.id}
                onClick={() => handleOrderClick(order)}
                interactive
                hoverable
                className="w-full text-left"
              >
                {/* Top row: Address and Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-slate-900">
                      ${order.requested_amount.toFixed(0)} delivered to {addressLabel}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {deliveryDate}
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Bottom row: Rating if rated */}
                {isRated && order.runner_rating && (
                  <div className="flex items-center mt-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-amber-500">
                      ★ {order.runner_rating.toFixed(1)} • You rated this runner
                    </div>
                  </div>
                )}
              </CustomerCard>
            );
          })}
        </div>
      )}
    </CustomerScreen>
  );
}

