/**
 * Runner Order Map Component
 * 
 * Shows route for runner:
 * - Before Cash Withdrawn: ATM location only
 * - After Cash Withdrawn: ATM → Customer route
 * - Navigate button opens Google/Apple Maps
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatus } from '@/types/types';
import { MapPin, Navigation, Copy, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface RunnerOrderMapProps {
  orderStatus: OrderStatus;
  customerLocation?: Location;
  atmLocation?: Location;
  className?: string;
}

export function RunnerOrderMap({
  orderStatus,
  customerLocation,
  atmLocation,
  className
}: RunnerOrderMapProps) {
  const showCustomerLocation = ['Cash Withdrawn', 'Pending Handoff', 'Completed'].includes(orderStatus);

  const handleNavigate = (location?: Location) => {
    if (!location) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${location.lat},${location.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;

    window.open(url, '_blank');
  };

  const handleCopyAddress = (address?: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied');
    }
  };

  const getStaticMapUrl = (locations: Location[]) => {
    if (locations.length === 0) return '';
    
    const markers = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
    // Using OpenStreetMap static map
    const center = locations[0];
    return `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng-0.02},${center.lat-0.02},${center.lng+0.02},${center.lat+0.02}&layer=mapnik`;
  };

  const mapLocations = showCustomerLocation && customerLocation
    ? [atmLocation, customerLocation].filter(Boolean) as Location[]
    : atmLocation ? [atmLocation] : [];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {showCustomerLocation ? 'Route to Customer' : 'ATM Location'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map View */}
        {mapLocations.length > 0 && (
          <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
            <iframe
              src={getStaticMapUrl(mapLocations)}
              className="w-full h-full border-0"
              title="Route map"
              loading="lazy"
            />
          </div>
        )}

        {/* ATM Location */}
        {atmLocation && (
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Banknote className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">ATM Location</p>
                {atmLocation.address && (
                  <p className="text-sm text-muted-foreground">{atmLocation.address}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => handleNavigate(atmLocation)}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate to ATM
              </Button>
              {atmLocation.address && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyAddress(atmLocation.address)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Customer Location (after cash pickup) */}
        {showCustomerLocation && customerLocation && (
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Customer Location</p>
                {customerLocation.address && (
                  <p className="text-sm text-muted-foreground">{customerLocation.address}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => handleNavigate(customerLocation)}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate to Customer
              </Button>
              {customerLocation.address && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyAddress(customerLocation.address)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          {!showCustomerLocation ? (
            <p>📍 Head to the ATM to withdraw cash. Customer location will be shown after withdrawal.</p>
          ) : (
            <p>📍 Cash withdrawn! Navigate to customer location for delivery.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
