/**
 * OrderCard Component - Emotionally Intuitive Design
 * 
 * Displays a single order in a card format with tap-to-expand animation.
 * No dropdowns - entire card is tappable. Clean, scannable, trustworthy.
 * Enhanced with runner personalization and psychological microcopy.
 */

import { MapPin, DollarSign, Flag, User } from 'lucide-react';
import { StatusChip } from '@/components/ui/StatusChip';
import { getOrderDuration, formatDate } from '@/lib/utils';
import type { OrderWithDetails } from '@/types/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/common/Avatar';
import { useNavigate } from 'react-router-dom';

interface OrderCardProps {
  order: OrderWithDetails;
  onReorder?: (order: OrderWithDetails) => void;
  onRate?: (order: OrderWithDetails) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

/**
 * Truncate address to city and state (e.g., "Brickell, Miami" or "Miami, FL")
 */
function truncateAddress(address: string): string {
  const parts = address.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    // Get last 2 parts (usually city, state)
    const cityState = parts.slice(-2);
    // Remove postal code if present (e.g., "Miami FL 33139" -> "Miami FL")
    const statePart = cityState[1];
    if (statePart) {
      // Remove postal code (5 digits or 5-4 format)
      const stateOnly = statePart.replace(/\s+\d{5}(-\d{4})?$/, '');
      return `${cityState[0]}, ${stateOnly}`;
    }
    return cityState.join(', ');
  }
  // Fallback: return first 2 meaningful words
  const words = address.split(/\s+/).filter(w => w.length > 0).slice(0, 2);
  return words.join(' ');
}

export function OrderCard({ order, onReorder, onRate, isExpanded, onToggle }: OrderCardProps) {
  const navigate = useNavigate();
  
  // If completed, navigate to order detail page on click
  const handleCardClick = () => {
    if (order.status === 'Completed') {
      navigate(`/customer/orders/${order.id}`);
      return;
    }
    // For non-completed orders, use toggle if provided
    if (onToggle) {
      onToggle();
    }
  };
  
  const isExpandedState = isExpanded ?? false;

  // Calculate duration
  const duration = order.status === 'Completed' && order.handoff_completed_at
    ? getOrderDuration(order.created_at, order.handoff_completed_at)
    : order.status === 'Cancelled' && order.cancelled_at
    ? getOrderDuration(order.created_at, order.cancelled_at)
    : null;

  // Format address
  const fullAddress = order.address_snapshot
    ? `${order.address_snapshot.line1}${order.address_snapshot.line2 ? `, ${order.address_snapshot.line2}` : ''}, ${order.address_snapshot.city}, ${order.address_snapshot.state} ${order.address_snapshot.postal_code}`
    : order.customer_address || 'Address not available';
  
  const shortAddress = truncateAddress(fullAddress);

  // Format date/time
  const orderDate = new Date(order.created_at);
  const dateStr = formatDate(orderDate, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });


  // Runner information
  const runner = order.runner;
  const hasRunner = runner && (order.status === 'Completed' || order.status !== 'Cancelled');

  // Calculate delivery time comparison (fallback to generic if no comparison data)
  const getDeliveryMicrocopy = () => {
    if (order.status !== 'Completed' || !order.handoff_completed_at) return null;
    
    const duration = getOrderDuration(order.created_at, order.handoff_completed_at);
    if (!duration) return null;
    
    // For now, use a generic positive message
    // In the future, we can compare against average delivery times
    const runnerName = runner?.first_name || 'Your runner';
    return `${runnerName} delivered your cash safely — ${duration} total time.`;
  };

  const deliveryMicrocopy = getDeliveryMicrocopy();

  // Status-based border color (subtle left border)
  const getBorderColor = () => {
    if (order.status === 'Completed') {
      return 'border-l-[3px] border-l-green-500/60';
    } else if (order.status === 'Cancelled') {
      return 'border-l-[3px] border-l-red-500/60';
    }
    return '';
  };

  // Status-based shadow
  const getShadowClass = () => {
    return 'shadow-sm';
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700",
        getBorderColor(),
        getShadowClass(),
        "transition-all duration-300 ease-in-out cursor-pointer",
        "hover:shadow-md active:scale-[0.99]"
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-expanded={isExpandedState}
    >
      <div className="p-4">
        {/* Header Row: Status + Amount */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusChip status={order.status} tone="customer" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              #{order.id.slice(0, 8)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              ${order.requested_amount.toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {dateStr} · {timeStr}
            </p>
          </div>
        </div>

        {/* Summary Bar: Always visible */}
        <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg mb-3 overflow-hidden">
          {/* Total Paid */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <DollarSign className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              ${order.total_payment.toFixed(2)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />

          {/* Duration */}
          {duration ? (
            <>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Flag className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {duration}
                </span>
              </div>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />
            </>
          ) : null}

          {/* Address (shortened) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              {shortAddress}
            </span>
          </div>
        </div>

        {/* Expanded Content: Only show for non-completed orders */}
        {!order.status.includes('Completed') && isExpandedState && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Fee Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <span>💰</span>
                <span>Fee Breakdown</span>
              </h3>
              <div className="space-y-2 pl-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Delivery Fee</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    ${order.delivery_fee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Compliance Fee</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    ${order.compliance_fee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Platform Fee</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    ${order.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700 text-sm font-semibold">
                  <span className="text-zinc-900 dark:text-zinc-100">Total Paid</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    ${order.total_payment.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <span>🕒</span>
                <span>Timeline</span>
              </h3>
              <div className="space-y-2.5 pl-1">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">Ordered</span>
                    <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                      {formatDate(order.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {order.runner_accepted_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">Accepted</span>
                      <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                        {formatDate(order.runner_accepted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
                {order.cash_withdrawn_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">Cash Withdrawn</span>
                      <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                        {formatDate(order.cash_withdrawn_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
                {order.handoff_completed_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">Completed</span>
                      <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                        {formatDate(order.handoff_completed_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
                {order.cancelled_at && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">Canceled</span>
                      <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                        {formatDate(order.cancelled_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Runner Personalization */}
            {hasRunner && runner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 animate-in fade-in duration-300">
                <Avatar
                  src={runner.avatar_url || undefined}
                  fallback={runner.first_name || 'Runner'}
                  size="sm"
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {runner.first_name || 'Your runner'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-0.5">
                    {(runner as any).fun_fact || "One of Benjamin's trusted cash runners"}
                  </p>
                </div>
              </div>
            )}

            {/* Runner Not Assigned (for canceled orders) */}
            {order.status === 'Cancelled' && !runner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 opacity-60">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Runner not assigned
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Address (full) */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span>📍</span>
                <span>Delivery Address</span>
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 pl-1">
                {fullAddress}
              </p>
            </div>

            {/* Canceled Message */}
            {order.status === 'Cancelled' && (
              <div className="pt-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Order canceled {order.cancelled_by === order.customer_id ? 'by you' : 'by runner'}
                  {order.cancellation_reason && `: ${order.cancellation_reason}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
