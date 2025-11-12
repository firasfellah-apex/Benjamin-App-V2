import { X, MapPin, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShellCard } from "@/components/ui/ShellCard";
import { getRunnerPayout } from "@/lib/payouts";
import type { OrderWithDetails } from "@/types/types";
import { getCustomerAddressDisplay } from "@/lib/revealRunnerView";

interface NewJobAlertProps {
  order: OrderWithDetails;
  onAccept: () => void;
  onDismiss: () => void;
  onViewDetails: () => void;
  accepting?: boolean;
}

export function NewJobAlert({
  order,
  onAccept,
  onDismiss,
  onViewDetails,
  accepting = false,
}: NewJobAlertProps) {
  const payout = getRunnerPayout(order);
  // For available orders (status = "Pending"), show neighborhood/city + zip only
  let deliveryArea = "your area";
  if (order.address_snapshot) {
    const city = order.address_snapshot.city || '';
    const zip = order.address_snapshot.postal_code || '';
    if (city && zip) {
      deliveryArea = `${city}, ${zip}`;
    } else if (city) {
      deliveryArea = city;
    }
  } else if (order.customer_address) {
    // Extract from address string - try to get city and zip
    const parts = order.customer_address.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      // Check if last part has zip (5 digits)
      const zipMatch = lastPart.match(/\b\d{5}\b/);
      if (zipMatch) {
        deliveryArea = `${secondLast}, ${zipMatch[0]}`;
      } else {
        deliveryArea = `${secondLast}, ${lastPart}`;
      }
    } else {
      deliveryArea = order.customer_address;
    }
  }

  return (
    <ShellCard variant="runner" className="bg-indigo-500/10 border-indigo-500/50 animate-in slide-in-from-top-2">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-white">New delivery available</h3>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide">
                  You can earn
                </span>
                <span className="text-2xl font-bold text-emerald-400">
                  ${payout.toFixed(2)}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">Delivery near {deliveryArea}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onAccept}
            disabled={accepting}
            className="flex-1 bg-[#4F46E5] text-white font-medium hover:bg-[#4338CA]"
          >
            {accepting ? "Accepting..." : "Accept"}
          </Button>
          <Button
            onClick={onViewDetails}
            variant="outline"
            className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </div>
    </ShellCard>
  );
}

