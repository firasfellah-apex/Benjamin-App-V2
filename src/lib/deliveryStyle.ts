/**
 * Delivery Style Utility Functions
 * 
 * Provides labels, hints, and instructions for delivery style (Counted vs Speed)
 * used throughout the runner app to communicate handoff expectations.
 */

import type { DeliveryStyle } from '@/types/types';

/**
 * Single source of truth: Resolve delivery style from an order
 * Checks delivery_style first, then falls back to delivery_mode for legacy orders
 */
export function resolveDeliveryStyleFromOrder(order: any): DeliveryStyle {
  const style = (order as any).delivery_style as DeliveryStyle | null;
  const mode = (order as any).delivery_mode as ('quick_handoff' | 'count_confirm' | null);

  // Source of truth: delivery_style
  if (style === 'COUNTED') return 'COUNTED';
  if (style === 'SPEED') return 'SPEED';

  // Legacy fallback: delivery_mode
  if (mode === 'count_confirm') return 'COUNTED';
  if (mode === 'quick_handoff') return 'SPEED';

  // Default: speed handoff
  return 'SPEED';
}

/**
 * Get delivery style copy (labels, descriptions, etc.)
 */
export function getDeliveryStyleCopy(style: DeliveryStyle) {
  if (style === 'COUNTED') {
    return {
      key: 'COUNTED',
      label: 'Counted handoff',
      shortLabel: 'Counted',
      description: 'Customer counts the cash in front of the runner before handoff is marked complete.'
    };
  }
  return {
    key: 'SPEED',
    label: 'Speed handoff',
    shortLabel: 'Speed',
    description: 'Fast, discreet handoff – no counting required on the spot.'
  };
}

/**
 * Get a human-readable label for the delivery style
 * @deprecated Use getDeliveryStyleCopy().label instead
 */
export function getDeliveryStyleLabel(style: DeliveryStyle): string {
  return getDeliveryStyleCopy(style).label;
}

/**
 * Get a short hint about what the runner should expect
 */
export function getDeliveryStyleShortHint(style: DeliveryStyle): string {
  return style === 'COUNTED'
    ? 'Stay while they count the cash.'
    : 'Hand off and you can leave.';
}

/**
 * Get chip label for delivery style (shown above OTP input)
 */
export function getDeliveryStyleChipLabel(style: DeliveryStyle): string {
  return style === 'COUNTED' 
    ? 'Counted · let them count in front of you'
    : 'Speed · quick handoff after the code';
}

/**
 * Get detailed arrival instructions for the runner
 * Use whitespace-pre-line to preserve line breaks
 * Returns plain text (no markdown) - use <strong> tags in JSX if needed
 */
export function getArrivalInstruction(style: DeliveryStyle): string {
  if (style === 'COUNTED') {
    return 'This customer chose a Counted handoff.\n\nAfter you enter the OTP, stay with the customer while they count the cash in front of you. Do not leave until they confirm everything is correct.';
  }
  
  return 'This customer chose a Speed handoff.\n\nAfter you enter the OTP, hand the cash to the customer and you may depart. They will count the cash later on their own.';
}

/**
 * Get footer text to display under the OTP input field
 */
export function getOtpFooterText(style: DeliveryStyle): string {
  return style === 'COUNTED'
    ? 'Once the code is accepted, wait while the customer counts the cash in front of you.'
    : 'Once the code is accepted, you may hand the cash and leave.';
}

/**
 * Get the delivery style from an order, with backward compatibility
 * Falls back to delivery_mode if delivery_style is not set
 * @deprecated Use resolveDeliveryStyleFromOrder() instead
 */
export function getOrderDeliveryStyle(order: { delivery_style?: DeliveryStyle | null; delivery_mode?: 'quick_handoff' | 'count_confirm' | null }): DeliveryStyle {
  return resolveDeliveryStyleFromOrder(order);
}
