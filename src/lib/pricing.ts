/**
 * Benjamin Cash Delivery Service - Pricing Calculation
 * 
 * Centralized pricing logic with future-proofing for distance-based pricing.
 * 
 * Current (MVP): Static fees based on amount only
 * Future: Incorporate distance, time of day, surge pricing, risk scoring
 */

import type { PricingInput, PricingBreakdown } from '@/types/types';

/**
 * Calculate pricing breakdown for a cash delivery order
 * 
 * @param input - Pricing parameters (amount, address, etc.)
 * @returns Complete pricing breakdown
 * 
 * Formula (current):
 * - Platform Fee (profit): max($3.50, 2% of amount)
 * - Compliance Fee: (1.01% of amount) + $1.90
 * - Delivery Fee: Fixed $8.16
 * - Total Service Fee: Sum of all fees
 * - Total Payment: Amount + Total Service Fee
 * 
 * Future enhancements:
 * - Distance-based delivery fee
 * - Time-of-day surge pricing
 * - Risk-based compliance adjustments
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { amount, customerAddress } = input;

  // Platform Fee (profit): max($3.50, 2% of amount)
  const platformFee = Math.max(3.50, amount * 0.02);

  // Compliance Fee: (1.01% of amount) + $1.90
  const complianceFee = (amount * 0.0101) + 1.90;

  // Delivery Fee: Fixed $8.16 (MVP)
  // Future: Calculate based on distance from customerAddress
  const deliveryFee = 8.16;
  
  // Future distance-based calculation (commented out for MVP):
  // if (customerAddress && input.runnerLocation) {
  //   const distance = calculateDistance(
  //     customerAddress.lat, 
  //     customerAddress.lng,
  //     input.runnerLocation.lat,
  //     input.runnerLocation.lng
  //   );
  //   deliveryFee = calculateDeliveryFeeByDistance(distance);
  // }

  // Total Service Fee
  const totalServiceFee = platformFee + complianceFee + deliveryFee;

  // Total Payment
  const total = amount + totalServiceFee;

  return {
    platformFee: Number(platformFee.toFixed(2)),
    complianceFee: Number(complianceFee.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    totalServiceFee: Number(totalServiceFee.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

/**
 * Validate pricing input
 * 
 * @param input - Pricing parameters to validate
 * @returns Validation result with error message if invalid
 */
export function validatePricingInput(input: PricingInput): {
  valid: boolean;
  error?: string;
} {
  // Amount validation
  if (input.amount < 100) {
    return { valid: false, error: 'Minimum amount is $100' };
  }

  if (input.amount > 1000) {
    return { valid: false, error: 'Maximum amount is $1,000' };
  }

  if (input.amount % 20 !== 0) {
    return { valid: false, error: 'Amount must be in $20 increments' };
  }

  // Address validation (optional for MVP, required for future)
  // if (!input.customerAddress) {
  //   return { valid: false, error: 'Delivery address is required' };
  // }

  return { valid: true };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 * 
 * Note: This is prepared for future use but not currently called
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Number(distance.toFixed(2));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on distance
 * 
 * @param distance - Distance in miles
 * @returns Delivery fee in dollars
 * 
 * Note: This is prepared for future use but not currently called
 * 
 * Example tiered pricing:
 * - 0-2 miles: $8.16
 * - 2-5 miles: $12.00
 * - 5-10 miles: $18.00
 * - 10+ miles: $25.00
 */
export function calculateDeliveryFeeByDistance(distance: number): number {
  if (distance <= 2) return 8.16;
  if (distance <= 5) return 12.00;
  if (distance <= 10) return 18.00;
  return 25.00;
}
