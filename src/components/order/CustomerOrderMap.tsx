/**
 * Customer Order Map Component
 * 
 * Shows runner location and route with status-gated visibility:
 * - Before live tracking is available: FindingBenjamin map-style animation
 * - After live tracking unlocks: Live runner location + ETA + route
 */

import { useState, useEffect } from 'react';
import { canShowLiveRoute } from '@/lib/reveal';
import { OrderStatus } from '@/types/types';
import { Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FindingBenjamin } from '@/components/Loading/FindingBenjamin';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface CustomerOrderMapProps {
  orderStatus: OrderStatus;
  customerLocation?: Location;
  runnerLocation?: Location;
  atmLocation?: Location;
  estimatedArrival?: string;
  className?: string;
}

export function CustomerOrderMap({
  orderStatus,
  customerLocation,
  runnerLocation,
  atmLocation,
  estimatedArrival,
  className
}: CustomerOrderMapProps) {
  const canShowMap = canShowLiveRoute(orderStatus);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (canShowMap && !isRevealing) {
      setIsRevealing(true);
      setTimeout(() => setIsRevealing(false), 500);
    }
  }, [canShowMap]);

  const getStaticMapUrl = (lat: number, lng: number, zoom = 15) => {
    // Using OpenStreetMap static map service
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
  };

  if (!canShowMap) {
    // Show FindingBenjamin animation as a map placeholder
    // This appears before live tracking is available
    return (
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        <FindingBenjamin />
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full bg-slate-100 pointer-events-none', className)}>
      {/* Map View - Full Screen */}
      <div
        className={cn(
          'relative h-full w-full bg-slate-100 transition-all duration-500 pointer-events-none',
          isRevealing && 'animate-in fade-in zoom-in-95'
        )}
      >
        {customerLocation && (
          <iframe
            src={getStaticMapUrl(customerLocation.lat, customerLocation.lng)}
            className="w-full h-full border-0 pointer-events-none"
            title="Delivery location map"
            loading="lazy"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* ETA Overlay */}
        {estimatedArrival && (
          <div className="absolute top-20 left-4 right-4 z-10">
            <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Estimated Arrival</p>
                <p className="text-sm font-medium text-slate-900">{estimatedArrival}</p>
              </div>
            </div>
          </div>
        )}

        {/* Runner Location Indicator */}
        {runnerLocation && (
          <div className="absolute bottom-24 left-4 z-10">
            <div className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-full shadow-lg">
              <Navigation className="h-4 w-4" />
              <span className="text-sm font-medium">Runner nearby</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
