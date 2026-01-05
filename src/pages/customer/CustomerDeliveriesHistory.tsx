/**
 * Customer Deliveries History Page
 * 
 * Clean, trust-focused list of past deliveries
 */

import { useNavigate } from "react-router-dom";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { useCustomerDeliveries } from "@/features/customer/hooks/useCustomerDeliveries";
import { Skeleton } from "@/components/common/Skeleton";
import { 
  formatDeliveryTitle, 
  formatDeliveryListTimestamp, 
  isDeliveryDelivered
} from "@/lib/orderDisplay";
import type { CustomerDelivery } from "@/types/delivery";
import LottieComponent from 'lottie-react';
import historicalOrdersAnimation from '@/assets/animations/HistoricalOrders.json';


/**
 * Primary label helper (amount + label first, fallback to title)
 */
function getDeliveryPrimaryLabel(delivery: CustomerDelivery): string {
  // If we have a friendly label (Home, Work, Maria's), prefer that.
  const label =
    (delivery as any)?.address_label ||
    (delivery as any)?.addressSnapshot?.label ||
    delivery.locationLabel ||
    null;

  const amount = delivery.amountDelivered ?? (delivery as any)?.cash_amount ?? (delivery as any)?.requested_amount;

  if (amount != null && label) {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} · ${label}`;
  }

  // Fallback to existing formatter if available
  if (amount != null && !label) {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} delivered`;
  }

  return formatDeliveryTitle(delivery);
}

/**
 * Shared delivery status badge
 * Matches the "Delivered" pill used on the Latest Order card.
 */
function DeliveryStatusBadge({ delivery }: { delivery: CustomerDelivery }) {
  const isDelivered = isDeliveryDelivered(delivery);
  const isCancelled = delivery.status === "cancelled";

  if (isCancelled) {
    return (
      <span 
        className="inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-medium"
        style={{
          backgroundColor: '#FEE5E7',
          color: '#E84855',
          borderColor: '#E84855'
        }}
      >
        Cancelled
      </span>
    );
  }

  if (isDelivered) {
    return (
      <span 
        className="inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-medium"
        style={{
          backgroundColor: '#E5FBF2',
          color: '#047857',
          borderColor: '#13F287'
        }}
      >
        Delivered
      </span>
    );
  }

  // In-progress (Pending / Runner Assigned / On the way…)
  return (
    <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-0.5 text-[11px] font-medium text-sky-700">
      In progress
    </span>
  );
}

/**
 * Delivery Row Skeleton
 */
function DeliveryRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-1">
      <div className="flex flex-col min-w-0 flex-1">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
  );
}

/**
 * Delivery Row Component
 */
function DeliveryRow({ delivery, onClick }: { delivery: CustomerDelivery; onClick: () => void }) {
  const handleRowClick = () => {
    onClick();
  };

  return (
    <div
      onClick={handleRowClick}
      className="w-full rounded-xl bg-white border border-[#F0F0F0] p-4 active:opacity-95 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side: text stack */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Primary line */}
          <span className="text-sm font-semibold text-slate-900 truncate">
            {getDeliveryPrimaryLabel(delivery)}
          </span>

          {/* Secondary line: just time */}
          <span className="mt-0.5 text-xs text-slate-500">
            {formatDeliveryListTimestamp(delivery)}
          </span>
        </div>

        {/* Right side: status pill only */}
        <div className="flex items-center flex-shrink-0 pl-2 self-start">
          <DeliveryStatusBadge delivery={delivery} />
        </div>
      </div>
    </div>
  );
}

/**
 * Group deliveries by day (Today vs Earlier)
 */
function groupDeliveriesByDay(deliveries: CustomerDelivery[]) {
  const today: CustomerDelivery[] = [];
  const earlier: CustomerDelivery[] = [];

  const now = new Date();
  const todayKey = now.toDateString();

  deliveries.forEach((d) => {
    const createdAt = new Date(d.createdAt || d.deliveredAt || Date.now());
    const key = createdAt.toDateString();
    if (key === todayKey) {
      today.push(d);
    } else {
      earlier.push(d);
    }
  });

  return { today, earlier };
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

  // Fixed content: divider under title/subtitle (matches home page exactly)
  const fixedContent = (
    <>
      {/* Divider under title/subtitle - 24px spacing from subtitle (fixed, doesn't scroll) */}
      <div className="h-[6px] bg-[#F7F7F7] -mx-6" />
    </>
  );

  return (
    <CustomerScreen
      title="My Orders"
      subtitle="Your past cash orders at a glance"
      showBack={true}
      onBack={handleBack}
      useXButton={true}
      fixedContent={fixedContent}
    >
      {isLoading && deliveries.length === 0 ? (
        // Loading skeletons
        <div className="divide-y divide-neutral-100">
          {[1, 2, 3, 4].map((i) => (
            <DeliveryRowSkeleton key={i} />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        // Empty state - matches bank connection component styling
        <div className="w-full px-4 py-4">
          <div className="w-full rounded-xl bg-white px-4 py-4">
            <div className="space-y-4">
              {/* Animated orders icon - centered */}
              <div className="flex justify-center">
                <div className="w-12 h-12 flex items-center justify-center">
                  <LottieComponent
                    animationData={historicalOrdersAnimation}
                    loop={false}
                    autoplay={true}
                    style={{ width: '48px', height: '48px' }}
                  />
                </div>
              </div>
              
              {/* Header - centered */}
              <div className="flex items-center justify-center">
                <span className="text-base font-semibold text-slate-900">No Orders Yet</span>
              </div>
              
              {/* Subtitle - centered */}
              <div className="flex items-center justify-center">
                <p className="text-sm text-slate-700 text-center">
                  All your historical orders will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Delivery list - grouped by day
        (() => {
          const { today, earlier } = groupDeliveriesByDay(deliveries);

          return (
            <div className="space-y-4">
              {today.length > 0 && (
                <section>
                  <h3 className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Today
                  </h3>
                  <div className="space-y-3">
                    {today.map((delivery) => (
                      <DeliveryRow
                        key={delivery.id}
                        delivery={delivery}
                        onClick={() => handleDeliveryClick(delivery)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {earlier.length > 0 && (
                <section>
                  <h3 className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Earlier
                  </h3>
                  <div className="space-y-3">
                    {earlier.map((delivery) => (
                      <DeliveryRow
                        key={delivery.id}
                        delivery={delivery}
                        onClick={() => handleDeliveryClick(delivery)}
                      />
                    ))}
                  </div>
                </section>
              )}

              <div className="h-6" />
            </div>
          );
        })()
      )}
    </CustomerScreen>
  );
}
