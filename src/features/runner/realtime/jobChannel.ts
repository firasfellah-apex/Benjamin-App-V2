/**
 * Job Channel Service
 * 
 * Handles realtime subscription to job offers for runners.
 * Integrates with existing useOrdersRealtime hook.
 */

import { useCallback } from 'react';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useRunnerJobs } from '../state/runnerJobsStore';
import { useProfile } from '@/contexts/ProfileContext';
import { getRunnerPayout } from '@/lib/payouts';
import { supabase } from '@/db/supabase';
import type { Order, OrderWithDetails } from '@/types/types';
import type { Offer } from '../state/runnerJobsStore';

/**
 * Hook to subscribe to job offers when runner is online
 */
export function useJobOffersSubscription() {
  const { online, receiveOffer } = useRunnerJobs();
  const { profile } = useProfile();

  // Calculate offer expiration (30 seconds from now)
  const getExpirationTime = (): string => {
    const expiresInSeconds = 30; // 30 seconds default
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);
    return expiresAt.toISOString();
  };

  // Transform order to offer
  const orderToOffer = useCallback((order: OrderWithDetails): Offer | null => {
    if (!order.address_snapshot) {
      return null; // Need address snapshot for pickup location
    }

    const payout = getRunnerPayout(order);
    
    // Extract pickup location (ATM) - use customer address as pickup point
    // In reality, this would be the ATM location, but we'll use customer address for now
    const pickup = {
      name: order.address_snapshot.city || "Pickup Location",
      lat: order.address_snapshot.latitude || 0,
      lng: order.address_snapshot.longitude || 0,
    };

    // Extract dropoff neighborhood
    const dropoffApprox: { neighborhood?: string } = {};
    if (order.address_snapshot.city) {
      dropoffApprox.neighborhood = order.address_snapshot.city;
    } else if (order.customer_address) {
      // Fallback: extract from address string
      const parts = order.customer_address.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        dropoffApprox.neighborhood = parts[parts.length - 2]; // Usually city
      }
    }

    // Calculate distance (simplified - would need actual calculation from runner location)
    const distanceKm = 5; // TODO: Calculate actual distance from runner location

    // Estimate ETA (simplified)
    const etaMinutes = Math.ceil(distanceKm * 2); // Rough estimate

    return {
      id: order.id,
      cashAmount: order.requested_amount,
      payout,
      etaMinutes,
      distanceKm,
      pickup,
      dropoffApprox,
      expiresAt: getExpirationTime(),
      order: order as OrderWithDetails,
    };
  }, []);

  // Check if runner has already skipped this order
  const hasSkippedOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!profile?.id) return false;
    
    try {
      const { data, error } = await supabase
        .from('runner_offer_events')
        .select('id')
        .eq('runner_id', profile.id)
        .eq('offer_id', orderId)
        .in('event', ['skipped', 'timeout'])
        .limit(1);
      
      if (error) {
        // Table might not exist (42P01) or endpoint not found (404)
        // Gracefully degrade - assume order hasn't been skipped
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          return false;
        }
        // Only log non-404 errors
        if (error.code !== 'PGRST116') {
          console.warn('Error checking skipped orders:', error);
        }
        return false;
      }
      
      return (data?.length || 0) > 0;
    } catch (error: any) {
      // Catch network errors or other exceptions
      // Gracefully degrade - assume order hasn't been skipped
      if (error?.message?.includes('404') || error?.message?.includes('does not exist')) {
        return false;
      }
      console.warn('Error checking skipped orders:', error);
      return false;
    }
  }, [profile?.id]);

  // Handle new available order
  const handleNewOrder = useCallback(async (order: Order) => {
    if (!online) return;
    
    // Only process Pending orders with no runner
    if (order.status === 'Pending' && !order.runner_id) {
      // Check if runner has already skipped or timed-out this order
      const skipped = await hasSkippedOrder(order.id);
      if (skipped) {
        return; // Don't show orders the runner has already skipped or timed-out
      }
      
      const offer = orderToOffer(order as OrderWithDetails);
      if (offer) {
        receiveOffer(offer);
      }
    }
  }, [online, receiveOffer, orderToOffer, hasSkippedOrder]);

  // Handle order updates (remove if accepted)
  const handleOrderUpdate = useCallback((order: Order) => {
    // If order is no longer available, it will be handled by the store
    // when the offer expires or is skipped
  }, []);

  // Subscribe to available orders (only when online)
  useOrdersRealtime({
    filter: { mode: 'runner', availableOnly: true },
    onInsert: handleNewOrder,
    onUpdate: handleOrderUpdate,
    enabled: online && !!profile?.id,
  });
}

