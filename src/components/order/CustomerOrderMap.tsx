/**
 * Customer Order Map Component
 * 
 * Shows runner location and route with status-gated visibility:
 * - Before Cash Withdrawn: Blurred placeholder with lock icon
 * - After Cash Withdrawn: Live runner location + ETA + route
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SafetyBanner } from '@/components/common/SafetyBanner';
import { canShowLiveRoute } from '@/lib/reveal';
import { OrderStatus } from '@/types/types';
import { MapPin, Lock, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-0">
          {/* Blurred Placeholder */}
          <div className="relative h-64 bg-muted flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 blur-2xl" />
            <div className="relative z-10 flex flex-col items-center gap-4 text-center p-6">
              <div className="h-16 w-16 rounded-full bg-background/80 flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Location Hidden</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Runner location will be visible after cash pickup
                </p>
              </div>
            </div>
          </div>

          {/* Safety Banner */}
          <div className="p-4">
            <SafetyBanner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Map View */}
        <div
          className={cn(
            'relative h-64 bg-muted transition-all duration-500',
            isRevealing && 'animate-in fade-in zoom-in-95'
          )}
        >
          {customerLocation && (
            <iframe
              src={getStaticMapUrl(customerLocation.lat, customerLocation.lng)}
              className="w-full h-full border-0"
              title="Delivery location map"
              loading="lazy"
            />
          )}

          {/* ETA Overlay */}
          {estimatedArrival && (
            <div className="absolute top-4 left-4 right-4">
              <Card className="bg-background/95 backdrop-blur">
                <CardContent className="p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                    <p className="text-sm font-medium">{estimatedArrival}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Runner Location Indicator */}
          {runnerLocation && (
            <div className="absolute bottom-4 left-4">
              <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg">
                <Navigation className="h-4 w-4" />
                <span className="text-sm font-medium">Runner nearby</span>
              </div>
            </div>
          )}
        </div>

        {/* Address Display */}
        {customerLocation?.address && (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Delivery Address</p>
                <p className="text-sm text-muted-foreground">{customerLocation.address}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
