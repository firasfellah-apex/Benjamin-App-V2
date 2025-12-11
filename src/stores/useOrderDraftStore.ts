import { create } from "zustand";
import type { DeliveryMode } from "@/components/customer/DeliveryModeSelector";

/**
 * Order Draft Store
 * 
 * Persists in-progress order data when user is forced to verify bank
 * during the order confirmation flow.
 */

export interface DraftOrder {
  amount: number;
  deliveryMode: DeliveryMode;
  addressId: string;
  feeBreakdown?: {
    platformFee: number;
    complianceFee: number;
    deliveryFee: number;
    total: number;
  };
}

interface OrderDraftState {
  draft: DraftOrder | null;
  returnTo: string | null;
  setDraft: (draft: DraftOrder, returnTo?: string | null) => void;
  clearDraft: () => void;
}

export const useOrderDraftStore = create<OrderDraftState>((set) => ({
  draft: null,
  returnTo: null,
  setDraft: (draft, returnTo = null) =>
    set({ draft, returnTo }),
  clearDraft: () => set({ draft: null, returnTo: null }),
}));

