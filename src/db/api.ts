import { supabase } from "./supabase";
import type { Profile, Invitation, Order, OrderWithDetails, InvitationWithDetails, UserRole, OrderStatus, FeeCalculation } from "@/types/types";

// Fee Calculation
export function calculateFees(requestedAmount: number): FeeCalculation {
  const profit = Math.max(3.50, 0.02 * requestedAmount);
  const complianceFee = (0.0101 * requestedAmount) + 1.90;
  const deliveryFee = 8.16;
  const totalServiceFee = profit + complianceFee + deliveryFee;
  const totalPayment = requestedAmount + totalServiceFee;

  return {
    requestedAmount,
    profit: Number(profit.toFixed(2)),
    complianceFee: Number(complianceFee.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    totalServiceFee: Number(totalServiceFee.toFixed(2)),
    totalPayment: Number(totalPayment.toFixed(2))
  };
}

// Profile APIs
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  return data;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getProfilesByRole(role: UserRole): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .contains("role", [role])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profiles by role:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function assignRole(userId: string, role: UserRole): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return false;

  const currentRoles = profile.role || [];
  if (currentRoles.includes(role)) return true;

  const newRoles = [...currentRoles, role];

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRoles })
    .eq("id", userId);

  if (error) {
    console.error("Error assigning role:", error);
    return false;
  }

  return true;
}

export async function revokeRole(userId: string, role: UserRole): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return false;

  const currentRoles = profile.role || [];
  const newRoles = currentRoles.filter(r => r !== role);

  if (newRoles.length === 0) {
    newRoles.push('customer');
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRoles })
    .eq("id", userId);

  if (error) {
    console.error("Error revoking role:", error);
    return false;
  }

  return true;
}

// Invitation APIs
export async function createInvitation(
  email: string,
  roleToAssign: 'runner' | 'admin',
  inviteeFirstName?: string,
  inviteeLastName?: string,
  notes?: string
): Promise<Invitation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      email,
      invited_by: user.id,
      role_to_assign: roleToAssign,
      token,
      expires_at: expiresAt.toISOString(),
      invitee_first_name: inviteeFirstName,
      invitee_last_name: inviteeLastName,
      notes
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }

  return data;
}

export async function getPendingInvitations(): Promise<InvitationWithDetails[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      *,
      inviter:invited_by(*)
    `)
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAllInvitations(): Promise<InvitationWithDetails[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      *,
      inviter:invited_by(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function validateInvitationToken(token: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("is_used", false)
    .eq("status", "Pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase
      .from("invitations")
      .update({ status: "Expired" })
      .eq("id", data.id);
    return null;
  }

  return data;
}

export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  const invitation = await validateInvitationToken(token);
  if (!invitation) return false;

  const { error: invError } = await supabase
    .from("invitations")
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      status: "Accepted"
    })
    .eq("id", invitation.id);

  if (invError) {
    console.error("Error accepting invitation:", invError);
    return false;
  }

  const roleToAdd = invitation.role_to_assign as UserRole;
  await assignRole(userId, roleToAdd);

  await supabase
    .from("profiles")
    .update({
      invited_by: invitation.invited_by,
      invitation_accepted_at: new Date().toISOString()
    })
    .eq("id", userId);

  return true;
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("invitations")
    .update({ status: "Revoked" })
    .eq("id", invitationId);

  if (error) {
    console.error("Error revoking invitation:", error);
    return false;
  }

  return true;
}

// Order APIs
export async function createOrder(
  requestedAmount: number,
  customerAddress: string,
  customerName: string
): Promise<Order | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const fees = calculateFees(requestedAmount);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      requested_amount: fees.requestedAmount,
      profit: fees.profit,
      compliance_fee: fees.complianceFee,
      delivery_fee: fees.deliveryFee,
      total_service_fee: fees.totalServiceFee,
      total_payment: fees.totalPayment,
      customer_address: customerAddress,
      customer_name: customerName,
      status: "Pending"
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }

  return data;
}

export async function getCustomerOrders(): Promise<OrderWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getRunnerOrders(): Promise<OrderWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq("runner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching runner orders:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAvailableOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching available orders:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAllOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all orders:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching order:", error);
    return null;
  }

  return data;
}

export async function acceptOrder(orderId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("orders")
    .update({
      runner_id: user.id,
      status: "Runner Accepted",
      runner_accepted_at: new Date().toISOString()
    })
    .eq("id", orderId)
    .eq("status", "Pending");

  if (error) {
    console.error("Error accepting order:", error);
    return false;
  }

  return true;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  additionalData?: Partial<Order>
): Promise<boolean> {
  const updates: Partial<Order> = { status, ...additionalData };

  if (status === "Runner at ATM") {
    updates.runner_at_atm_at = new Date().toISOString();
  } else if (status === "Cash Withdrawn") {
    updates.cash_withdrawn_at = new Date().toISOString();
  } else if (status === "Completed") {
    updates.handoff_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId);

  if (error) {
    console.error("Error updating order status:", error);
    return false;
  }

  return true;
}

export async function generateOTP(orderId: string): Promise<string | null> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  const { error } = await supabase
    .from("orders")
    .update({
      otp_code: otp,
      otp_expires_at: expiresAt.toISOString(),
      otp_attempts: 0,
      status: "Pending Handoff"
    })
    .eq("id", orderId);

  if (error) {
    console.error("Error generating OTP:", error);
    return null;
  }

  return otp;
}

export async function verifyOTP(orderId: string, otp: string): Promise<boolean> {
  const { data: order } = await supabase
    .from("orders")
    .select("otp_code, otp_expires_at, otp_attempts")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.otp_code || !order.otp_expires_at) {
    return false;
  }

  if (new Date(order.otp_expires_at) < new Date()) {
    return false;
  }

  if (order.otp_attempts >= 3) {
    return false;
  }

  if (order.otp_code !== otp) {
    await supabase
      .from("orders")
      .update({ otp_attempts: order.otp_attempts + 1 })
      .eq("id", orderId);
    return false;
  }

  await updateOrderStatus(orderId, "Completed");
  return true;
}

export async function cancelOrder(orderId: string, reason: string): Promise<boolean> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "Cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason
    })
    .eq("id", orderId);

  if (error) {
    console.error("Error cancelling order:", error);
    return false;
  }

  return true;
}

// Audit Log APIs
export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from("audit_logs")
    .insert({
      user_id: user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues || null,
      new_values: newValues || null
    });
}

export async function getAuditLogs(limit = 100): Promise<any[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// Real-time subscriptions
export function subscribeToOrders(callback: (payload: any) => void) {
  return supabase
    .channel("orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, callback)
    .subscribe();
}

export function subscribeToOrder(orderId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`order:${orderId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, callback)
    .subscribe();
}
