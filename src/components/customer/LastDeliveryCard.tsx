/**
 * LastDeliveryCard Component
 * 
 * Displays the most recent completed delivery in a compact card format.
 * Matches Benjamin UI design system with consistent styling.
 * Shows delivery amount, address, time, rating status, and navigation to full history.
 */

import { useNavigate } from "react-router-dom";
import type { OrderWithDetails } from "@/types/types";

interface LastDeliveryCardProps {
  order: OrderWithDetails;
  onRateRunner?: (orderId: string) => void;
  onViewAll?: () => void;
}

/**
 * Get address label from order
 */
function getAddressLabel(order: OrderWithDetails): string {
  if (order.address_snapshot?.label) {
    return order.address_snapshot.label;
  }
  
  // Try to get from address snapshot line1
  if (order.address_snapshot?.line1) {
    const parts = order.address_snapshot.line1.split(',');
    return parts[0] || 'Delivery address';
  }
  
  // Fallback to customer_address
  if (order.customer_address) {
    const parts = order.customer_address.split(',');
    return parts[0] || 'Delivery address';
  }
  
  return 'Delivery address';
}

/**
 * Format date label (e.g., "Today" or "Oct 11")
 */
function formatDateLabel(date: Date): string {
  const today = new Date();
  const orderDate = new Date(date);
  
  // Check if same day
  if (
    orderDate.getDate() === today.getDate() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  
  // Check if yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    orderDate.getDate() === yesterday.getDate() &&
    orderDate.getMonth() === yesterday.getMonth() &&
    orderDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  
  // Otherwise format as "Oct 11"
  return orderDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time label (e.g., "9:43 AM")
 */
function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function LastDeliveryCard({ order, onRateRunner, onViewAll }: LastDeliveryCardProps) {
  const navigate = useNavigate();
  
  if (!order) return null;
  
  const isRated = !!order.runner_rating;
  const canRate = order.status === 'Completed' && !isRated;
  const isCancelled = order.status === 'Cancelled';
  
  // For completed orders, use handoff_completed_at; for cancelled, use updated_at
  const orderDate = isCancelled
    ? new Date(order.updated_at)
    : (order.handoff_completed_at ? new Date(order.handoff_completed_at) : new Date(order.created_at));
  
  const addressLabel = getAddressLabel(order);
  const dateLabel = formatDateLabel(orderDate);
  const timeLabel = formatTimeLabel(orderDate);
  const amount = order.requested_amount;
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRateRunner) {
      onRateRunner(order.id);
    } else {
      // Navigate to order detail page where rating can be done
      navigate(`/customer/deliveries/${order.id}`);
    }
  };
  
  const handleViewAllClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/customer/deliveries');
    }
  };
  
  return (
    // Standardized spacing: px-6 (24px) horizontal and vertical
    // Internal spacing: space-y-6 (24px) for grouped UI blocks
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 px-6 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">
              Last delivery
            </div>
            <div className="text-[15px] font-medium text-slate-900">
              ${amount.toFixed(0)} {isCancelled ? 'requested' : 'delivered'} to {addressLabel}
            </div>
            <div className="text-[11px] text-slate-500">
              {dateLabel} · {timeLabel}
            </div>
          </div>
          
          {/* Status pill */}
          {isCancelled ? (
            <div className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Cancelled
            </div>
          ) : (
            <div className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Delivered
            </div>
          )}
        </div>
        
        {/* Divider */}
        <div className="border-t border-slate-200" />
        
        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          {canRate ? (
            <button
              type="button"
              onClick={handleRateClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-yellow-400 text-gray-900 text-sm font-semibold border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400 active:scale-[0.98] active:opacity-90 transition-all duration-150"
            >
              <span className="text-base leading-[0]">★</span>
              <span>Rate runner</span>
            </button>
          ) : isRated && order.runner_rating ? (
            <div className="text-[10px] text-amber-500">
              ★ {order.runner_rating.toFixed(1)} • You rated this runner
            </div>
          ) : isCancelled ? (
            <div className="text-[10px] text-slate-400">
              This order was cancelled.
            </div>
          ) : (
            <div className="text-[10px] text-slate-400">
              Thank you for using Benjamin.
            </div>
          )}
          
          <button
            type="button"
            onClick={handleViewAllClick}
            className="ml-auto text-[10px] font-medium text-slate-500 inline-flex items-center gap-1 transition-colors"
          >
            View all deliveries
            <span aria-hidden="true" className="text-slate-400">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

