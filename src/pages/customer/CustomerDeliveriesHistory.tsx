/**
 * Customer Deliveries History Page
 * 
 * Clean, trust-focused list of past deliveries with smooth animations
 */

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Package } from "@/lib/icons";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { useCustomerDeliveries } from "@/features/customer/hooks/useCustomerDeliveries";
import { StatusBadge } from "@/components/customer/deliveries/StatusBadge";
import { Skeleton } from "@/components/common/Skeleton";
import { formatDate } from "@/lib/utils";
import type { CustomerDelivery } from "@/types/delivery";

/**
 * Format delivery date and time for display
 */
function formatDeliveryDateTime(delivery: CustomerDelivery): { date: string; time: string } {
  const date = delivery.deliveredAt 
    ? new Date(delivery.deliveredAt)
    : new Date(delivery.createdAt);
  
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
  
  return { date: dateStr, time: timeStr };
}

/**
 * Delivery Card Skeleton
 */
function DeliveryCardSkeleton() {
  return (
    <div className="rounded-3xl bg-white shadow-sm border border-slate-100 px-6 py-4 mb-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Delivery Card Component
 */
function DeliveryCard({ delivery, onClick }: { delivery: CustomerDelivery; onClick: () => void }) {
  const { date, time } = formatDeliveryDateTime(delivery);
  const runnerInitials = delivery.runner?.displayName
    ? delivery.runner.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="rounded-3xl bg-white shadow-sm border border-slate-100 px-6 py-4 mb-3 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="mt-1 h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
          {delivery.runner?.avatarUrl ? (
            <img 
              src={delivery.runner.avatarUrl} 
              alt={delivery.runner.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            runnerInitials
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: Amount + Location + Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">
                ${delivery.amountDelivered.toLocaleString()} delivered to {delivery.locationLabel}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {date} · {time}
              </div>
            </div>
            <StatusBadge status={delivery.status} />
          </div>

          {/* Rating / Rate CTA row */}
          <div className="mt-2 flex items-center justify-between gap-2">
            {delivery.customerRating ? (
              <div className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
                ★ {delivery.customerRating.toFixed(1)} · Your rating
              </div>
            ) : delivery.status === "delivered" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors"
              >
                ★ Rate runner
              </button>
            ) : null}

            <div className="text-[11px] text-slate-400 ml-auto">
              Tap for details →
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CustomerDeliveriesHistory() {
  const navigate = useNavigate();
  const { deliveries, isLoading } = useCustomerDeliveries();

  const handleBack = () => {
    navigate('/customer/home');
  };

  const handleDeliveryClick = (delivery: CustomerDelivery) => {
    navigate(`/customer/deliveries/${delivery.id}`, {
      state: { delivery }, // Pass delivery in state for instant render
    });
  };

  return (
    <CustomerScreen
      title="My Orders"
      subtitle="Your past cash orders at a glance"
      showBack={true}
      onBack={handleBack}
      useXButton={true}
    >
      <motion.div layout className="space-y-0">
        {isLoading && deliveries.length === 0 ? (
          // Loading skeletons
          <div className="space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <DeliveryCardSkeleton key={i} />
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          // Empty state - Standardized spacing: px-6 (24px) horizontal
          <div className="w-full px-6 py-6">
            <div className="w-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#F4F7FB] flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 text-center">
                No deliveries yet
              </h3>
              <p className="text-sm text-slate-500 text-center max-w-[280px]">
                Your completed deliveries will appear here.
              </p>
            </div>
          </div>
        ) : (
          // Delivery list
          <AnimatePresence mode="popLayout">
            {deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onClick={() => handleDeliveryClick(delivery)}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </CustomerScreen>
  );
}

