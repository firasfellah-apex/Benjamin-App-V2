/**
 * Runner Jobs Store
 * 
 * Global state management for runner job offers and active jobs.
 * Uses React Context pattern (no external state library needed).
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { OrderWithDetails } from '@/types/types';
import { acceptOrder, skipRunnerOffer, logRunnerOfferEvent } from '@/db/api';

export type Offer = {
  id: string;
  cashAmount: number;
  payout: number;
  etaMinutes: number;
  distanceKm: number;
  pickup: { name: string; lat: number; lng: number };
  dropoffApprox: { neighborhood?: string };
  expiresAt: string; // ISO timestamp
  order: OrderWithDetails; // Full order details
};

export type ActiveJob = {
  id: string;
  order: OrderWithDetails;
  state: "accepted" | "arrived_at_atm" | "cash_withdrawn" | "enroute" | "delivered" | "cancelled";
};

type RunnerJobsState = {
  online: boolean;
  pendingOffer: Offer | null;
  offerQueue: Offer[]; // FIFO queue for multiple offers
  activeJob: ActiveJob | null;
  setOnline: (b: boolean) => void;
  receiveOffer: (offer: Offer) => void;
  acceptOffer: () => Promise<void>;
  skipOffer: (reason: "manual" | "timeout") => Promise<void>;
  clearOffer: () => void;
  setActiveJob: (job: ActiveJob | null) => void;
};

const RunnerJobsContext = createContext<RunnerJobsState | null>(null);

export function RunnerJobsProvider({ children }: { children: ReactNode }) {
  const [online, setOnlineState] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [offerQueue, setOfferQueue] = useState<Offer[]>([]);
  const [activeJob, setActiveJobState] = useState<ActiveJob | null>(null);

  const skipOfferRef = useCallback(async (reason: "manual" | "timeout") => {
    const currentOffer = pendingOffer;
    if (!currentOffer) return;

    try {
      await skipRunnerOffer(currentOffer.id, reason);

      // Clear pending offer
      setPendingOffer(null);

      // Process next offer in queue if any
      setOfferQueue(prev => {
        if (prev.length > 0) {
          const next = prev[0];
          setPendingOffer(next);
          return prev.slice(1);
        }
        return [];
      });
    } catch (error) {
      console.error('Error skipping offer:', error);
      // Still clear the offer even if logging fails
      setPendingOffer(null);
      setOfferQueue(prev => {
        if (prev.length > 0) {
          const next = prev[0];
          setPendingOffer(next);
          return prev.slice(1);
        }
        return [];
      });
    }
  }, [pendingOffer]);

  const setOnline = useCallback((b: boolean) => {
    setOnlineState(b);
    // If going offline, clear pending offer
    if (!b && pendingOffer) {
      // Auto-skip pending offer when going offline
      skipOfferRef("timeout");
      setPendingOffer(null);
      setOfferQueue([]);
    }
  }, [pendingOffer, skipOfferRef]);

  const receiveOffer = useCallback((offer: Offer) => {
    if (!online) {
      return; // Don't show offers when offline
    }

    // If there's already a pending offer, queue this one
    if (pendingOffer) {
      setOfferQueue(prev => [...prev, offer]);
      return;
    }

    // Show immediately
    setPendingOffer(offer);
  }, [online, pendingOffer]);

  const acceptOffer = useCallback(async () => {
    if (!pendingOffer) return;

    try {
      const result = await acceptOrder(pendingOffer.id);
      
      if (result.success) {
        // Log event
        await logRunnerOfferEvent({
          offerId: pendingOffer.id,
          event: 'accepted',
        });

        // Set active job
        setActiveJobState({
          id: pendingOffer.id,
          order: pendingOffer.order,
          state: "accepted",
        });

        // Clear pending offer
        setPendingOffer(null);

        // Process next offer in queue if any
        setOfferQueue(prev => {
          if (prev.length > 0) {
            const next = prev[0];
            setPendingOffer(next);
            return prev.slice(1);
          }
          return [];
        });
      } else {
        throw new Error(result.error || 'Failed to accept offer');
      }
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }, [pendingOffer]);

  const skipOffer = skipOfferRef;

  const clearOffer = useCallback(() => {
    setPendingOffer(null);
  }, []);

  const setActiveJob = useCallback((job: ActiveJob | null) => {
    setActiveJobState(job);
  }, []);

  return (
    <RunnerJobsContext.Provider
      value={{
        online,
        pendingOffer,
        offerQueue,
        activeJob,
        setOnline,
        receiveOffer,
        acceptOffer,
        skipOffer,
        clearOffer,
        setActiveJob,
      }}
    >
      {children}
    </RunnerJobsContext.Provider>
  );
}

export function useRunnerJobs() {
  const context = useContext(RunnerJobsContext);
  if (!context) {
    throw new Error('useRunnerJobs must be used within RunnerJobsProvider');
  }
  return context;
}

