/**
 * Customer Order Map Component
 * 
 * Shows runner location and route with status-gated visibility:
 * - Before Cash Withdrawn: Blurred placeholder with lock icon
 * - After Cash Withdrawn: Live runner location + ETA + route
 */

import { useState, useEffect } from 'react';
import { canShowLiveRoute } from '@/lib/reveal';
import { OrderStatus } from '@/types/types';
import { Lock, Navigation, Clock, ShieldCheck, Wallet, MapPin } from 'lucide-react';
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

const EDUCATION_TIPS = [
  {
    id: 'privacy',
    title: 'Why the map is locked',
    body: "For safety, we only show your runner's location after pickup.",
    icon: ShieldCheck,
  },
  {
    id: 'after-pickup',
    title: 'After cash pickup',
    body: 'Once your runner has your cash, this becomes a live route + ETA.',
    icon: MapPin,
  },
  {
    id: 'how-it-works',
    title: "What's happening now",
    body: 'Benjamin is assigning a vetted runner and sending them to the ATM.',
    icon: Wallet,
  },
];

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
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Rotate education tips while the map is locked
  useEffect(() => {
    if (canShowMap) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % EDUCATION_TIPS.length);
    }, 7000); // 7s per tip

    return () => clearInterval(interval);
  }, [canShowMap]);

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
    // For full-screen map view, return a gradient background instead of card
    // Center content vertically between top of screen and bottom sheet modal
    // The modal takes up space at the bottom, so we center in the upper portion
    
    // ===== ORIGINAL VERSION (to revert, uncomment below and comment out the new version) =====
    // return (
    //   <div className={cn('relative h-full w-full bg-gradient-to-br from-slate-100 to-slate-200', className)}>
    //     {/* Soft gradient background when map is not available */}
    //     {/* Positioned to center vertically in the visible area above the bottom sheet */}
    //     <div 
    //       className="absolute left-0 right-0 flex items-center justify-center"
    //       style={{
    //         top: 0,
    //         bottom: '35%', // Leave space for bottom sheet modal
    //       }}
    //     >
    //       <div className="text-center space-y-4 p-6">
    //         <div className="h-16 w-16 rounded-full bg-white/80 flex items-center justify-center mx-auto">
    //           <Lock className="h-8 w-8 text-slate-400" />
    //         </div>
    //         <div className="space-y-2">
    //           <p className="font-medium text-slate-700">Location Hidden</p>
    //           <p className="text-sm text-slate-500 max-w-xs mx-auto">
    //             Runner location will be visible after cash pickup
    //           </p>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // );
    
    // ===== NEW VERSION: Blurred map background + rotating tips =====
    const activeTip = EDUCATION_TIPS[currentTipIndex];
    const ActiveIcon = activeTip.icon;

    return (
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        {/* Blurred map background */}
        {customerLocation ? (
          <div 
            className="absolute inset-0"
            style={{ 
              filter: 'blur(8px)',
              transform: 'scale(1.05)',
            }}
          >
            <iframe
              src={getStaticMapUrl(customerLocation.lat, customerLocation.lng)}
              className="w-full h-full border-0 pointer-events-none"
              title="Blurred delivery location map"
              loading="lazy"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        ) : (
          // Fallback to gradient if no location
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-100/90 to-emerald-50" />
        )}

        {/* Overlay to reduce brightness and add subtle emerald tint */}
        <div className="absolute inset-0 bg-emerald-50/50" />

        {/* Subtle animated overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/20 via-emerald-300/15 to-emerald-200/20 animate-gradient-pulse" />

        {/* Content centered in the visible area above the bottom sheet */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center"
          style={{ top: 0, bottom: '35%' }}
        >
          <div className="text-center space-y-4 p-6 relative z-10 max-w-sm mx-auto">
            {/* Lock icon */}
            <div className="h-16 w-16 rounded-full bg-white/85 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>

            {/* Main headline + single explainer line */}
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Map locked for now</p>
              <p className="text-sm text-slate-600">
                You'll see live tracking here once your runner has your cash.
              </p>
            </div>

            {/* One short rotating tip */}
            <div className="mt-4 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm px-4 py-3 text-left flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <ActiveIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900">{activeTip.title}</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {activeTip.body}
                </p>
              </div>
            </div>
          </div>
        </div>
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
