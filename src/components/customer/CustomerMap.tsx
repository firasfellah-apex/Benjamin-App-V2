/**
 * CustomerMap Component
 * 
 * Dedicated map component for customer request flow.
 * Uses BenjaminMap with simplified props interface.
 * 
 * Behavior:
 * - Centers map on selectedAddress if lat/lng provided
 * - Falls back to default center (Miami) if no address
 * - Fills container completely
 * - Shows marker for selected address
 */

import React from 'react';
import { BenjaminMap } from '@/components/map/BenjaminMap';

export interface CustomerMapProps {
  selectedAddress?: {
    lat?: number;
    lng?: number;
    label?: string;
  } | null;
}

export function CustomerMap({ selectedAddress }: CustomerMapProps) {
  // Default fallback center (Miami)
  const fallbackCenter = { lat: 25.7617, lng: -80.1918 };
  
  // Use selected address coordinates or fallback
  const center = (selectedAddress?.lat && selectedAddress?.lng)
    ? { lat: selectedAddress.lat, lng: selectedAddress.lng }
    : fallbackCenter;

  // Marker label
  const markerLabel = selectedAddress?.label || "Delivery location";

  return (
    <div className="w-full h-full">
      <BenjaminMap
        center={center}
        customerPosition={center}
        zoom={15}
        height="100%"
        fallback={
          <div className="w-full h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-600">{markerLabel}</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

