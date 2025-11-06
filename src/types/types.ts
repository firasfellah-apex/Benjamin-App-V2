export type UserRole = 'customer' | 'runner' | 'admin';

export type OrderStatus = 
  | 'Pending' 
  | 'Runner Accepted' 
  | 'Runner at ATM' 
  | 'Cash Withdrawn' 
  | 'Pending Handoff' 
  | 'Completed' 
  | 'Cancelled';

export type InvitationStatus = 'Pending' | 'Accepted' | 'Expired' | 'Revoked';

export type KYCStatus = 'Pending' | 'Approved' | 'Failed';

export interface Profile {
  id: string;
  email: string | null;
  google_id: string | null;
  role: UserRole[];
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_suspended: boolean;
  kyc_status: KYCStatus;
  invited_by: string | null;
  invitation_accepted_at: string | null;
  daily_limit: number;
  daily_usage: number;
  daily_limit_last_reset: string;
  monthly_earnings: number;
  approved_by: string | null;
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
  otp_code: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  customer_address: string | null;
  customer_name: string | null;
  runner_accepted_at: string | null;
  runner_at_atm_at: string | null;
  cash_withdrawn_at: string | null;
  handoff_completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
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
