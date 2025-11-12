/**
 * CustomerActiveDeliveryMap Component
 * 
 * Shows live map for active customer deliveries.
 * 
 * Behavior:
 * - Only shows map when status >= 'Cash Withdrawn' (uses canShowLiveLocation)
 * - In dev/non-prod: Uses mock Brickell coordinates with animated runner path
 * - In prod: Uses real coordinates from order (when available)
 * - Shows runner info when allowed by reveal rules
 * - Falls back gracefully if Maps unavailable
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BenjaminMap, MapPosition } from '@/components/map/BenjaminMap';
import { canShowLiveLocation, canRevealRunnerIdentity } from '@/lib/reveal';
import { isProd, hasGoogleMaps } from '@/lib/env';
import type { OrderWithDetails } from '@/types/types';
import { Avatar } from '@/components/common/Avatar';
import { Card, CardContent } from '@/components/ui/card';

export interface CustomerActiveDeliveryMapProps {
  /**
   * The active order
   */
  order: OrderWithDetails;
  
  /**
   * Optional runner profile data
   */
  runnerProfile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    fun_fact?: string;
  };
}

/**
 * Mock coordinates for Brickell, Miami (Brickell City Centre area)
 */
const MOCK_BRICKELL_CUSTOMER: MapPosition = {
  lat: 25.7683,
  lng: -80.1937,
};

/**
 * Mock runner path (small array of points around Brickell)
 * Creates a short path from a starting point to customer
 */
const MOCK_RUNNER_PATH: MapPosition[] = [
  { lat: 25.7730, lng: -80.1900 }, // Start point (slightly north)
  { lat: 25.7715, lng: -80.1915 }, // Mid point 1
  { lat: 25.7700, lng: -80.1925 }, // Mid point 2
  MOCK_BRICKELL_CUSTOMER, // Customer location
];

/**
 * Animation step duration in milliseconds
 */
const ANIMATION_STEP_MS = 2000;

export const CustomerActiveDeliveryMap: React.FC<CustomerActiveDeliveryMapProps> = ({
  order,
  runnerProfile,
}) => {
  const [animatedRunnerPosition, setAnimatedRunnerPosition] = useState<MapPosition | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  // Determine if we should show the map
  const shouldShowMap = canShowLiveLocation(order.status);

  // Determine customer position
  const customerPosition = useMemo<MapPosition | null>(() => {
    // In production, use real coordinates from order
    if (isProd && order.address_snapshot?.latitude && order.address_snapshot?.longitude) {
      return {
        lat: order.address_snapshot.latitude,
        lng: order.address_snapshot.longitude,
      };
    }
    
    // In dev/non-prod or if real coordinates not available, use mock
    if (!isProd || !order.address_snapshot?.latitude) {
      return MOCK_BRICKELL_CUSTOMER;
    }
    
    return null;
  }, [order.address_snapshot, isProd]);

  // Determine runner position
  const runnerPosition = useMemo<MapPosition | null>(() => {
    // In production, use real coordinates from order/runner (when available)
    // For now, we don't have runner location in DB yet, so we'll use mock in all cases
    // This is future-ready: when order.runner_lat/lng exist, use them here
    
    // Use animated position if available (for mock animation)
    if (animatedRunnerPosition) {
      return animatedRunnerPosition;
    }
    
    // Fallback: use a point near customer for mock
    if (!isProd || !order.runner_id) {
      return MOCK_RUNNER_PATH[0];
    }
    
    return null;
  }, [animatedRunnerPosition, order.runner_id, isProd]);

  // Calculate path from runner to customer
  const path = useMemo<MapPosition[] | undefined>(() => {
    if (!runnerPosition || !customerPosition) return undefined;
    
    // In dev/non-prod: use mock path
    if (!isProd) {
      // Return path from current runner position to customer
      const currentIndex = MOCK_RUNNER_PATH.findIndex(
        p => p.lat === runnerPosition.lat && p.lng === runnerPosition.lng
      );
      if (currentIndex >= 0 && currentIndex < MOCK_RUNNER_PATH.length - 1) {
        return MOCK_RUNNER_PATH.slice(currentIndex);
      }
      return [runnerPosition, customerPosition];
    }
    
    // In prod: when we have real runner location, create path
    // For now, return simple path from runner to customer
    return runnerPosition && customerPosition ? [runnerPosition, customerPosition] : undefined;
  }, [runnerPosition, customerPosition, isProd]);

  // Animate runner position in dev/non-prod
  useEffect(() => {
    if (!shouldShowMap || isProd || !hasGoogleMaps) {
      return;
    }

    // Start animation from first point
    setAnimatedRunnerPosition(MOCK_RUNNER_PATH[0]);
    setAnimationStep(0);

    const interval = setInterval(() => {
      setAnimationStep((prevStep) => {
        const nextStep = prevStep + 1;
        
        // If we've reached the end, stop animation
        if (nextStep >= MOCK_RUNNER_PATH.length) {
          clearInterval(interval);
          return prevStep;
        }
        
        // Update runner position to next point
        setAnimatedRunnerPosition(MOCK_RUNNER_PATH[nextStep]);
        return nextStep;
      });
    }, ANIMATION_STEP_MS);

    return () => clearInterval(interval);
  }, [shouldShowMap, isProd]);

  // If we shouldn't show the map, render "Location hidden" UI
  if (!shouldShowMap) {
    return (
      <Card className="bg-neutral-50 border border-neutral-200">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            Location hidden
          </p>
          <p className="text-xs text-neutral-500">
            {canRevealRunnerIdentity(order.status)
              ? "For everyone's safety, runner details and live tracking appear only once your cash is secured."
              : "Runner information will appear once assigned."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // If no customer position, show fallback
  if (!customerPosition) {
    return (
      <Card className="bg-neutral-50 border border-neutral-200">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            Map unavailable
          </p>
          <p className="text-xs text-neutral-500">
            Delivery location not available. You'll still see updates here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate map center (between runner and customer, or just customer)
  const mapCenter: MapPosition = runnerPosition
    ? {
        lat: (runnerPosition.lat + customerPosition.lat) / 2,
        lng: (runnerPosition.lng + customerPosition.lng) / 2,
      }
    : customerPosition;

  // Calculate zoom level based on distance (rough estimate)
  const zoom = runnerPosition ? 14 : 15;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div>
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">
            Live delivery tracking
          </h3>
          <p className="text-xs text-neutral-500">
            This preview is approximate. You'll get a notification when your cash arrives.
          </p>
        </div>
        
        <BenjaminMap
          center={mapCenter}
          runnerPosition={runnerPosition || undefined}
          customerPosition={customerPosition}
          path={path}
          zoom={zoom}
          height="220px"
        />
      </div>

      {/* Runner info (only when allowed by reveal rules) */}
      {canRevealRunnerIdentity(order.status) && runnerProfile && (
        <Card className="bg-blue-50 border border-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Avatar
                src={runnerProfile.avatar_url || undefined}
                fallback={runnerProfile.first_name || 'Runner'}
                size="sm"
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900">
                  {runnerProfile.first_name || 'Your runner'}
                </p>
                {runnerProfile.fun_fact && (
                  <p className="text-xs text-blue-700 italic mt-0.5">
                    {runnerProfile.fun_fact}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

CustomerActiveDeliveryMap.displayName = 'CustomerActiveDeliveryMap';

