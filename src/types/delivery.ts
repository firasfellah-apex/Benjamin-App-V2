/**
 * Customer Delivery Types
 * 
 * Types for the customer deliveries history feature
 */

export type DeliveryStatus = "delivered" | "cancelled" | "issue_reported" | "incomplete";

export interface RunnerSummary {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  averageRating?: number | null; // from all users
}

export interface CustomerDelivery {
  id: string;
  customerId: string;
  runner?: RunnerSummary | null;
  amountDelivered: number;      // e.g. 340 (USD)
  totalPaid: number;            // amountCharged = cash + fees
  locationLabel: string;        // "Home", "Office", or short address line
  addressLine1: string;         // "1091 W 59th Pl"
  createdAt: string;            // ISO
  deliveredAt?: string | null;  // ISO
  status: DeliveryStatus;
  customerRating?: number | null; // 1-5 stars
  customerReview?: string | null;
  // Additional fields for detail view
  serviceFee?: number;
  profit?: number;
  complianceFee?: number;
  deliveryFee?: number;
  runnerAcceptedAt?: string | null;
  runnerAtAtmAt?: string | null;
  cashWithdrawnAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

