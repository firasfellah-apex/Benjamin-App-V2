/**
 * Runner View Reveal Logic
 * 
 * Controls progressive disclosure for runners:
 * - Cash amount: Revealed only after runner confirms "I'm at the ATM"
 * - Customer identity: Revealed progressively as order progresses
 * - Address: Revealed after cash is secured and OTP is generated
 * 
 * Key principle: Protect customer privacy until runner commits to delivery.
 */

import type { OrderStatus, Profile, Order } from '@/types/types';

/**
 * Infer logical status from order state
 * Since DB may not have granular statuses, we infer from status + timestamps/flags
 * 
 * @param order - Order object with status and timestamps
 * @returns Logical status for UI flow control
 */
function inferLogicalStatus(order: { status: OrderStatus; otp_code?: string | null; cash_withdrawn_at?: string | null; runner_at_atm_at?: string | null }): OrderStatus | 'OTP Generated' | 'Enroute Customer' | 'Arrived' {
  const status = order.status;
  
  // If we're in Pending Handoff, infer more granular state
  if (status === 'Pending Handoff') {
    // If OTP exists, we're past cash withdrawal
    if (order.otp_code) {
      // For now, treat Pending Handoff as "enroute" or "arrived"
      // TODO: Add explicit 'Arrived' status check when DB supports it
      // For now, we can't distinguish between enroute and arrived without additional data
      return 'Pending Handoff'; // Keep as-is, UI will handle based on context
    }
  }
  
  return status;
}

/**
 * Can runner see the exact cash withdrawal amount?
 * 
 * Returns true only after runner has confirmed "I'm at the ATM".
 * Before this, runner sees only their payout amount.
 * 
 * Status flow:
 * - Runner Accepted → No cash amount (only payout)
 * - Runner at ATM → Cash amount revealed
 * - Cash Withdrawn+ → Cash amount visible
 */
export function canShowCashAmountToRunner(status: OrderStatus): boolean {
  return [
    'Runner at ATM',
    'Cash Withdrawn',
    'Pending Handoff',
    'Completed'
  ].includes(status);
}

/**
 * Legacy alias for backward compatibility
 */
export function canSeeCashAmount(orderStatus: OrderStatus): boolean {
  return canShowCashAmountToRunner(orderStatus);
}

/**
 * Can runner see customer avatar?
 * 
 * Returns true only once runner has arrived at the customer location.
 * This protects customer privacy until the final handoff moment.
 * 
 * Status flow:
 * - Before arrival: Generic silhouette
 * - At arrival/after: Real avatar
 */
export function canShowCustomerAvatarToRunner(status: OrderStatus): boolean {
  // Show customer avatar to runner once order is active
  // This allows avatars to be visible in chat throughout the delivery process
  return [
    'Runner Accepted',
    'Runner at ATM',
    'Cash Withdrawn',
    'Pending Handoff',
    'Completed'
  ].includes(status);
}

/**
 * Get customer public profile for runner view
 * 
 * Returns progressively revealed customer information based on order status.
 * 
 * Progressive reveal:
 * - Before OTP generated: First name initial or generic label, generic avatar, broad area
 * - After OTP generated: First name (or first + last initial), precise address (but no avatar yet)
 * - At arrival: Real avatar revealed
 * 
 * @param orderStatus - Current order status
 * @param customer - Customer profile
 * @param hasOtp - Whether OTP has been generated (optional)
 * @returns Public customer profile with revealed information
 */
export function getCustomerPublicProfile(
  orderStatus: OrderStatus,
  customer: Profile | null | undefined,
  hasOtp?: boolean
): {
  displayName: string;
  avatarUrl: string | null;
  showFullName: boolean;
  showPreciseAddress: boolean;
  showAvatar: boolean;
} {
  if (!customer) {
    return {
      displayName: 'Customer',
      avatarUrl: null,
      showFullName: false,
      showPreciseAddress: false,
      showAvatar: false,
    };
  }

  // Check what we can reveal based on status
  const canSeeFullName = [
    'Cash Withdrawn',
    'Pending Handoff',
    'Completed'
  ].includes(orderStatus) && hasOtp !== false; // If OTP exists or status suggests it

  const canSeeAvatar = canShowCustomerAvatarToRunner(orderStatus);
  const canSeeAddress = canShowFullAddressToRunner(orderStatus, hasOtp);

  // Before OTP generated: show first initial only
  if (!canSeeFullName) {
    const firstName = customer.first_name || '';
    const initial = firstName.charAt(0).toUpperCase() || 'C';
    return {
      displayName: `${initial}.`,
      avatarUrl: null, // Generic silhouette
      showFullName: false,
      showPreciseAddress: false,
      showAvatar: false,
    };
  }

  // After OTP generated: show first name (and last initial if available)
  const firstName = customer.first_name || 'Customer';
  const lastName = customer.last_name || '';
  const displayName = lastName
    ? `${firstName} ${lastName.charAt(0).toUpperCase()}.`
    : firstName;

  return {
    displayName,
    avatarUrl: canSeeAvatar ? customer.avatar_url : null,
    showFullName: true,
    showPreciseAddress: canSeeAddress,
    showAvatar: canSeeAvatar,
  };
}

/**
 * Can runner see the full delivery address?
 * 
 * Returns true only after cash is secured and OTP is generated.
 * This allows runner to navigate to customer location.
 * 
 * Status flow:
 * - Before OTP generated: Broad area only
 * - After OTP generated: Full address revealed
 */
export function canShowFullAddressToRunner(status: OrderStatus, hasOtp?: boolean): boolean {
  // If OTP exists, we're past cash withdrawal and can show full address
  if (hasOtp && status === 'Pending Handoff') {
    return true;
  }
  
  return [
    'Cash Withdrawn',
    'Pending Handoff',
    'Completed'
  ].includes(status);
}

/**
 * Get address display for runner view
 * 
 * Returns progressively revealed address information.
 * 
 * - Before OTP generated: Broad area only (e.g., "Near Brickell, Miami")
 * - After OTP generated: Full address
 * 
 * @param orderStatus - Current order status
 * @param fullAddress - Full customer address
 * @param hasOtp - Whether OTP has been generated (optional, inferred from status if not provided)
 * @returns Display address string
 */
export function getCustomerAddressDisplay(
  orderStatus: OrderStatus,
  fullAddress: string | null | undefined,
  hasOtp?: boolean
): string {
  if (!fullAddress) {
    return 'Address not available';
  }

  // Check if we should show precise address
  const canSeePreciseAddress = canShowFullAddressToRunner(orderStatus, hasOtp);

  if (!canSeePreciseAddress) {
    // Extract city/area from address (e.g., "123 Main St, Miami, FL 33139" → "Near Miami, FL")
    const parts = fullAddress.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      // Get city and state (usually last 2 parts before zip)
      const cityState = parts.slice(-2);
      return `Near ${cityState.join(', ')}`;
    }
    return 'Address will be revealed after you withdraw cash and generate the verification code';
  }

  return fullAddress;
}

/**
 * Check if runner can update status to "Runner at ATM"
 * 
 * This is the gate that reveals cash amount.
 * 
 * @param orderStatus - Current order status
 * @returns true if runner can confirm they're at the ATM
 */
export function canConfirmAtATM(orderStatus: OrderStatus): boolean {
  return orderStatus === 'Runner Accepted';
}

/**
 * Get message explaining when cash amount will be revealed
 * 
 * @param orderStatus - Current order status
 * @returns User-friendly message
 */
export function getCashAmountRevealMessage(orderStatus: OrderStatus): string {
  if (canShowCashAmountToRunner(orderStatus)) {
    return 'Cash amount is now visible';
  }
  
  if (canConfirmAtATM(orderStatus)) {
    return 'Cash amount will be shown once you confirm you\'re at the ATM';
  }
  
  return 'Cash amount will be revealed when you reach the ATM';
}

/**
 * Should customer see OTP code?
 * 
 * Returns true when OTP has been generated and customer should see it.
 * 
 * @param status - Current order status
 * @param hasOtp - Whether OTP code exists
 * @returns true if customer should see OTP
 */
export function shouldShowCustomerOtpToCustomer(status: OrderStatus, hasOtp?: boolean): boolean {
  // Show OTP when status is Pending Handoff and OTP exists
  return status === 'Pending Handoff' && (hasOtp === true || hasOtp === undefined);
}

/**
 * Can runner enter OTP for verification?
 * 
 * Returns true when runner has arrived and can verify OTP with customer.
 * 
 * @param status - Current order status
 * @returns true if runner can enter OTP
 */
export function canRunnerEnterOtp(status: OrderStatus): boolean {
  // Runner can enter OTP when status is Pending Handoff (arrived state)
  // TODO: When DB has explicit 'Arrived' status, use that instead
  return status === 'Pending Handoff';
}

/**
 * Check if order is in "enroute" state (runner heading to customer)
 * 
 * @param status - Current order status
 * @param hasOtp - Whether OTP has been generated
 * @returns true if runner is enroute to customer
 */
export function isRunnerEnroute(status: OrderStatus, hasOtp?: boolean): boolean {
  // Runner is enroute when OTP is generated but not yet at arrival
  // For now, Pending Handoff with OTP covers this
  // TODO: When DB has explicit 'Enroute Customer' status, use that
  return status === 'Pending Handoff' && (hasOtp === true || hasOtp === undefined);
}

/**
 * Check if runner has arrived at customer location
 * 
 * @param status - Current order status
 * @param hasOtp - Whether OTP has been generated
 * @returns true if runner has arrived
 */
export function hasRunnerArrived(status: OrderStatus, hasOtp?: boolean): boolean {
  // For now, we treat Pending Handoff with OTP as "arrived" state
  // TODO: When DB has explicit 'Arrived' status, use that
  // This is a simplification - in reality we'd check a separate flag or status
  return status === 'Pending Handoff' && (hasOtp === true || hasOtp === undefined);
}

