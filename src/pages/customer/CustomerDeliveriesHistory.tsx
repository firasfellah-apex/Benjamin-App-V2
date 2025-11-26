/**
 * Customer Deliveries History Page
 * 
 * Clean, trust-focused list of past deliveries
 */

import { useNavigate } from "react-router-dom";
import { Package } from "@/lib/icons";
import { ChevronRight, Star, UserRound } from "lucide-react";
import { CustomerScreen } from "@/pages/customer/components/CustomerScreen";
import { useCustomerDeliveries } from "@/features/customer/hooks/useCustomerDeliveries";
import { Skeleton } from "@/components/common/Skeleton";
import { 
  formatDeliveryTitle, 
  formatDeliveryListTimestamp, 
  isDeliveryDelivered,
  hasDeliveryRating
} from "@/lib/orderDisplay";
import type { CustomerDelivery } from "@/types/delivery";


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
      <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-3 py-0.5 text-[11px] font-medium text-red-600">
        Cancelled
      </span>
    );
  }

  if (isDelivered) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-0.5 text-[11px] font-medium text-emerald-700">
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
  const isDelivered = isDeliveryDelivered(delivery);
  const isRated = hasDeliveryRating(delivery);
  const canRate = isDelivered && !isRated;

  const handleRowClick = () => {
    onClick();
  };

  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      onClick={handleRowClick}
      className="flex items-start justify-between gap-3 py-3 px-1 rounded-2xl active:bg-neutral-50 cursor-pointer"
    >
      {/* Left side: text stack only (avatar is now inside the rating chip) */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Primary line */}
        <span className="text-sm font-semibold text-slate-900 truncate">
          {getDeliveryPrimaryLabel(delivery)}
        </span>

        {/* Secondary line: just time (status is in the pill) */}
        <span className="mt-0.5 text-xs text-slate-500">
          {formatDeliveryListTimestamp(delivery)}
        </span>

        {/* Rating / rate affordance */}
        {isDelivered && (
          <div className="mt-1">
            {isRated && delivery.customerRating ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{delivery.customerRating.toFixed(1)} · Your rating</span>
              </span>
            ) : canRate ? (
              <button
                type="button"
                onClick={handleRateClick}
                className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
              >
                {/* Small runner avatar inside the chip */}
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-amber-100 overflow-hidden flex-shrink-0">
                  {delivery.runner && (delivery.runner.avatarUrl || (delivery.runner as any)?.avatar_url) ? (
                    <img
                      src={delivery.runner.avatarUrl || (delivery.runner as any)?.avatar_url}
                      alt={(delivery.runner as any)?.first_name || delivery.runner.displayName?.split(" ")[0] || "Runner"}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserRound className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <span>Rate runner</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Right side: status pill + chevron, aligned with primary title line */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-2 self-start">
        <DeliveryStatusBadge delivery={delivery} />
        <ChevronRight className="w-4 h-4 text-slate-300" />
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
                  <div>
                    {today.map((delivery, index) => (
                      <div key={delivery.id} className={index > 0 ? "mt-3" : ""}>
                        <DeliveryRow
                          delivery={delivery}
                          onClick={() => handleDeliveryClick(delivery)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {earlier.length > 0 && (
                <section>
                  <h3 className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Earlier
                  </h3>
                  <div>
                    {earlier.map((delivery, index) => (
                      <div key={delivery.id} className={index > 0 ? "mt-3" : ""}>
                        <DeliveryRow
                          delivery={delivery}
                          onClick={() => handleDeliveryClick(delivery)}
                        />
                      </div>
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
