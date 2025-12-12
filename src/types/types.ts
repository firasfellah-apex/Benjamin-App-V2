export type UserRole = 'customer' | 'runner' | 'admin';

export type OrderStatus = 
  | 'Pending' 
  | 'Runner Accepted' 
  | 'Runner at ATM' 
  | 'Cash Withdrawn' 
  | 'Pending Handoff' // Maps to: otp_generated, enroute_customer, arrived (DB may not have these yet)
  | 'Completed' 
  | 'Cancelled';

/**
 * Extended order statuses for tighter flow control
 * These may not exist in DB yet, but are used for UI logic and reveal rules
 * TODO: Add to DB enum when backend supports: 'OTP Generated', 'Enroute Customer', 'Arrived'
 */
export type ExtendedOrderStatus = OrderStatus | 'OTP Generated' | 'Enroute Customer' | 'Arrived';

export type InvitationStatus = 'Pending' | 'Accepted' | 'Expired' | 'Revoked';

export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'failed';

export type DeliveryStyle = 'COUNTED' | 'SPEED';

// Order Event for audit trail
export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_id: string | null;
  actor_role: UserRole | null;
  client_action_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Order Event with actor details (from rpc_get_order_history)
export interface OrderEventWithDetails extends OrderEvent {
  actor_name: string | null;
}

// Status transition validation
export interface StatusTransition {
  from_status: OrderStatus;
  to_status: OrderStatus;
  description: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  google_id: string | null;
  role: UserRole[];
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  fun_fact: string | null;
  usual_withdrawal_amount: number | null;
  preferred_handoff_style: 'speed' | 'counted' | 'depends' | null;
  cash_usage_categories: string[] | null;
  is_active: boolean;
  is_suspended: boolean;
  kyc_status: KYCStatus;
  kyc_verified_at: string | null;
  plaid_item_id: string | null;
  bank_institution_name: string | null;
  bank_institution_logo_url: string | null;
  invited_by: string | null;
  invitation_accepted_at: string | null;
  daily_limit: number;
  daily_usage: number;
  daily_limit_last_reset: string;
  monthly_earnings: number;
  approved_by: string | null;
  is_online: boolean;
  avg_runner_rating: number | null;
  runner_rating_count: number;
  avg_customer_rating: number | null;
  customer_rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  role_to_assign: 'runner' | 'admin';
  token: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  invitee_first_name: string | null;
  invitee_last_name: string | null;
  notes: string | null;
  status: InvitationStatus;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  icon: string | null; // Lucide icon name (e.g., 'Home', 'Building2', 'Heart')
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  custom_pin_lat: number | null; // Custom pin latitude set by customer (for meeting location)
  custom_pin_lng: number | null; // Custom pin longitude set by customer (for meeting location)
  is_default: boolean;
  delivery_notes: string | null;
  created_at: string;
}

export interface AddressSnapshot {
  label: string;
  icon: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  custom_pin_lat: number | null; // Custom pin latitude (for runner meeting location)
  custom_pin_lng: number | null; // Custom pin longitude (for runner meeting location)
}

export interface Order {
  id: string;
  customer_id: string;
  runner_id: string | null;
  requested_amount: number;
  profit: number;
  compliance_fee: number;
  delivery_fee: number;
  total_service_fee: number;
  total_payment: number;
  status: OrderStatus;
  delivery_mode: 'quick_handoff' | 'count_confirm' | null; // Delivery mode: Speed or Counted (legacy)
  delivery_style: DeliveryStyle | null; // Delivery style: COUNTED or SPEED
  otp_code: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_verified_at: string | null; // Timestamp when OTP was verified
  address_id: string | null;
  address_snapshot: AddressSnapshot | null;
  customer_address: string | null; // Legacy field, will be deprecated
  customer_name: string | null;
  customer_notes: string | null;
  runner_accepted_at: string | null;
  runner_at_atm_at: string | null;
  cash_withdrawn_at: string | null;
  handoff_completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  runner_rating: number | null;
  runner_rating_comment: string | null;
  customer_rating_by_runner: number | null;
  customer_rating_tags: string | null;
  atm_id: string | null;
  atm_distance_meters: number | null;
  pickup_name: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  customer?: Profile;
  runner?: Profile;
}

export interface InvitationWithDetails extends Invitation {
  inviter?: Profile;
}

export interface FeeCalculation {
  requestedAmount: number;
  profit: number;
  complianceFee: number;
  deliveryFee: number;
  totalServiceFee: number;
  totalPayment: number;
}

export interface PricingInput {
  amount: number;
  customerAddress?: {
    lat: number;
    lng: number;
  };
  // Future fields for distance-based pricing:
  // runnerLocation?: { lat: number; lng: number };
  // atmLocation?: { lat: number; lng: number };
  // timeOfDay?: string;
}

export interface PricingBreakdown {
  platformFee: number;
  complianceFee: number;
  deliveryFee: number;
  totalServiceFee: number;
  total: number;
}
