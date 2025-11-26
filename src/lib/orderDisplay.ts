/**
 * Order Display Helpers
 * 
 * Shared formatting functions for displaying orders consistently
 * across the customer app (Home card, Orders list, Order detail).
 */

import type { OrderWithDetails } from "@/types/types";

/**
 * Format order title (e.g., "$200 delivered to Maria's")
 * - Uses label if available, otherwise street address (line1)
 * - Abbreviates common street suffixes
 */
export function formatOrderTitle(order: OrderWithDetails): string {
  const amount = order.requested_amount ?? (order as any).requestedAmount ?? 0;
  const formattedAmount =
    typeof amount === "number"
      ? `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "$0";

  // Try address label first
  const snapshot = order.address_snapshot as any;
  const label = snapshot?.label?.trim();

  const rawLine1 =
    snapshot?.line1 ||
    (order.customer_address ? order.customer_address.split(",")[0]?.trim() : "");

  // Abbreviate long street names a bit
  const line1 = rawLine1
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bAvenue\b/gi, "Ave")
    .replace(/\bRoad\b/gi, "Rd")
    .replace(/\bBoulevard\b/gi, "Blvd")
    .replace(/\bNorthwest\b/gi, "NW")
    .replace(/\bNortheast\b/gi, "NE")
    .replace(/\bSouthwest\b/gi, "SW")
    .replace(/\bSoutheast\b/gi, "SE");

  const destination = label || line1 || "your address";

  return `${formattedAmount} delivered to ${destination}`;
}

/**
 * Format order list timestamp (e.g., "Today · 5:38 PM", "Yesterday · 9:14 PM", "Nov 12 · 4:32 PM")
 */
export function formatOrderListTimestamp(order: OrderWithDetails): string {
  // Use handoff_completed_at for completed orders, created_at otherwise
  const dateStr = order.handoff_completed_at || order.created_at;
  const createdAt = dateStr ? new Date(dateStr) : null;
  
  if (!createdAt) return "";

  const now = new Date();
  const sameDay =
    createdAt.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = createdAt.toDateString() === yesterday.toDateString();

  const time = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `Today · ${time}`;
  }

  if (isYesterday) {
    return `Yesterday · ${time}`;
  }

  const datePart = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${datePart} · ${time}`;
}

/**
 * Get order status label for display
 */
export function getOrderStatusLabel(order: OrderWithDetails): string {
  switch (order.status) {
    case "Completed":
      return "Delivered";
    case "Cancelled":
      return "Cancelled";
    case "Pending":
    case "Runner Accepted":
    case "Cash Withdrawn":
    case "Pending Handoff":
      return "In progress";
    default:
      return order.status || "Status";
  }
}

/**
 * Check if order is delivered
 */
export function isOrderDelivered(order: OrderWithDetails): boolean {
  return order.status === "Completed";
}

/**
 * Check if order has runner rating
 */
export function hasRunnerRating(order: OrderWithDetails): boolean {
  return typeof order.runner_rating === "number" && order.runner_rating > 0;
}

/**
 * Adapter functions for CustomerDelivery type
 * (used in CustomerDeliveriesHistory)
 */
import type { CustomerDelivery } from "@/types/delivery";

/**
 * Format delivery title (works with CustomerDelivery type)
 */
export function formatDeliveryTitle(delivery: CustomerDelivery): string {
  const formattedAmount = `$${delivery.amountDelivered.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  
  // Abbreviate common directional words for more compact display
  let destination = delivery.locationLabel || "your address";
  destination = destination
    .replace(/\bWest\b/gi, "W")
    .replace(/\bEast\b/gi, "E")
    .replace(/\bNorth\b/gi, "N")
    .replace(/\bSouth\b/gi, "S")
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bAvenue\b/gi, "Ave")
    .replace(/\bRoad\b/gi, "Rd")
    .replace(/\bBoulevard\b/gi, "Blvd");
  
  return `${formattedAmount} delivered to ${destination}`;
}

/**
 * Format delivery list timestamp (works with CustomerDelivery type)
 */
export function formatDeliveryListTimestamp(delivery: CustomerDelivery): string {
  const dateStr = delivery.deliveredAt || delivery.createdAt;
  const createdAt = dateStr ? new Date(dateStr) : null;
  
  if (!createdAt) return "";

  const now = new Date();
  const sameDay = createdAt.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = createdAt.toDateString() === yesterday.toDateString();

  const time = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `Today · ${time}`;
  }

  if (isYesterday) {
    return `Yesterday · ${time}`;
  }

  const datePart = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${datePart} · ${time}`;
}

/**
 * Get delivery status label (works with CustomerDelivery type)
 */
export function getDeliveryStatusLabel(delivery: CustomerDelivery): string {
  switch (delivery.status) {
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "incomplete":
      return "In progress";
    default:
      return "Status";
  }
}

/**
 * Check if delivery is delivered (works with CustomerDelivery type)
 */
export function isDeliveryDelivered(delivery: CustomerDelivery): boolean {
  return delivery.status === "delivered";
}

/**
 * Check if delivery has runner rating (works with CustomerDelivery type)
 */
export function hasDeliveryRating(delivery: CustomerDelivery): boolean {
  return typeof delivery.customerRating === "number" && delivery.customerRating > 0;
}

