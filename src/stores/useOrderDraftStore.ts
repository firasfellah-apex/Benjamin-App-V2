import { create } from "zustand";
import type { DeliveryMode } from "@/components/customer/DeliveryModeSelector";

/**
 * Order Draft Store
 * 
 * Persists in-progress order data across navigation during the 3-step order flow.
 * Used to maintain state when user navigates between steps or to bank accounts page.
 */

export type DeliveryStyle = "counted" | "speed";

export interface DraftOrder {
  addressId?: string;
  bankAccountId?: string;
  amount: number;
  deliveryStyle?: DeliveryStyle;
  feeBreakdown?: {
    platformFee: number;
    complianceFee: number;
    deliveryFee: number;
    total: number;
  };
  // Legacy fields for backward compatibility
  deliveryMode?: DeliveryMode; // Maps to deliveryStyle
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

