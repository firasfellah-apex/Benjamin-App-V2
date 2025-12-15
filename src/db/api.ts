import { supabase } from "./supabase";
import type { Profile, Invitation, Order, OrderWithDetails, InvitationWithDetails, UserRole, OrderStatus, FeeCalculation, OrderEventWithDetails, CustomerAddress, AddressSnapshot } from "@/types/types";

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

/**
 * Checks if daily_usage should be reset (new day since last reset)
 * and resets it if needed
 */
export async function checkAndResetDailyUsage(userId: string): Promise<void> {
  try {
    // Get current profile to check reset date
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("daily_limit_last_reset, daily_usage")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError || !profile) {
      console.error("[Daily Reset] Error fetching profile for reset check:", fetchError);
      return;
    }

    const lastReset = profile.daily_limit_last_reset 
      ? new Date(profile.daily_limit_last_reset) 
      : null;
    
    if (!lastReset) {
      // No reset date set, initialize it
      await supabase
        .from("profiles")
        .update({
          daily_limit_last_reset: new Date().toISOString(),
          daily_usage: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
      return;
    }

    // Check if it's a new day (compare dates, not times)
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    
    // Reset dates to midnight for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetDate = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate());

    // If today is after the reset date, reset daily_usage
    if (today > resetDate) {
      console.log("[Daily Reset] New day detected, resetting daily_usage", {
        lastReset: lastResetDate.toISOString(),
        today: today.toISOString(),
        previousUsage: profile.daily_usage
      });

      const { error: resetError } = await supabase
        .from("profiles")
        .update({
          daily_usage: 0,
          daily_limit_last_reset: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq("id", userId);

      if (resetError) {
        console.error("[Daily Reset] Error resetting daily_usage:", resetError);
      } else {
        console.log("[Daily Reset] ✅ Successfully reset daily_usage to 0");
      }
    }
  } catch (error) {
    console.error("[Daily Reset] Unexpected error checking/resetting daily usage:", error);
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check and reset daily usage if needed before fetching profile
  await checkAndResetDailyUsage(user.id);

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

export async function updateCurrentProfile(updates: {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  // Email is intentionally excluded - it cannot be changed via profile update
  // Email is managed through the authentication provider (Supabase Auth)
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Ensure email is never updated through this function
  const { email, ...safeUpdates } = updates as any;
  if (email !== undefined) {
    console.warn('Email update attempted but ignored. Email cannot be changed via profile update.');
  }

  const { error } = await supabase
    .from("profiles")
    .update(safeUpdates)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return false;
  }

  return true;
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
  const newRoles = currentRoles.filter((r: UserRole) => r !== role);

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

export async function acceptInvitation(token: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

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
  await assignRole(user.id, roleToAdd);

  await supabase
    .from("profiles")
    .update({
      invited_by: invitation.invited_by,
      invitation_accepted_at: new Date().toISOString()
    })
    .eq("id", user.id);

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

// Customer Address APIs
export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching addresses:", error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getDefaultAddress(): Promise<CustomerAddress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", user.id)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching default address:", error);
    return null;
  }

  return data;
}

export async function getAddressById(addressId: string): Promise<CustomerAddress | null> {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("id", addressId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching address:", error);
    return null;
  }

  return data;
}

export async function createAddress(address: {
  label: string;
  icon?: string | null;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  custom_pin_lat?: number;
  custom_pin_lng?: number;
  delivery_notes?: string | null;
  is_default?: boolean;
}): Promise<CustomerAddress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Build insert object, conditionally including custom_pin fields
  // This helps if migration hasn't been run yet (though migration should be run)
  const insertData: any = {
    customer_id: user.id,
    label: address.label,
    icon: address.icon || 'Home',
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    latitude: address.latitude || null,
    longitude: address.longitude || null,
    delivery_notes: address.delivery_notes || null,
    is_default: address.is_default || false
  };

  // Only include custom_pin fields if they have values
  // Note: Migration 20250130_add_custom_pin_coordinates.sql must be run for these to work
  if (address.custom_pin_lat !== undefined && address.custom_pin_lat !== null) {
    insertData.custom_pin_lat = address.custom_pin_lat;
  }
  if (address.custom_pin_lng !== undefined && address.custom_pin_lng !== null) {
    insertData.custom_pin_lng = address.custom_pin_lng;
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert(insertData)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error creating address:", error);
    // Provide helpful error message if custom_pin columns are missing
    if (error.message?.includes("custom_pin_lat") || error.message?.includes("custom_pin_lng")) {
      console.error("❌ ACTION REQUIRED: Run migration 20250130_add_custom_pin_coordinates.sql");
      console.error("See RUN_CUSTOM_PIN_MIGRATION.md for instructions");
    }
    return null;
  }

  return data;
}

export async function updateAddress(
  addressId: string,
  updates: {
    label?: string;
    icon?: string | null;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    latitude?: number | null;
    longitude?: number | null;
    custom_pin_lat?: number | null;
    custom_pin_lng?: number | null;
    delivery_notes?: string | null;
    is_default?: boolean;
  }
): Promise<boolean> {
  // Build update object, conditionally including custom_pin fields only if they have values
  // Note: Migration 20250130_add_custom_pin_coordinates.sql must be run for these to work
  const updateData: any = { ...updates };
  
  // Only include custom_pin fields if they have non-null values
  if (updates.custom_pin_lat === null || updates.custom_pin_lat === undefined) {
    delete updateData.custom_pin_lat;
  }
  if (updates.custom_pin_lng === null || updates.custom_pin_lng === undefined) {
    delete updateData.custom_pin_lng;
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update(updateData)
    .eq("id", addressId);

  if (error) {
    console.error("Error updating address:", error);
    // Provide helpful error message if custom_pin columns are missing
    if (error.message?.includes("custom_pin_lat") || error.message?.includes("custom_pin_lng")) {
      console.error("❌ ACTION REQUIRED: Run migration 20250130_add_custom_pin_coordinates.sql");
      console.error("See RUN_CUSTOM_PIN_MIGRATION.md for instructions");
    }
    return false;
  }

  return true;
}

export async function deleteAddress(addressId: string): Promise<boolean> {
  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId);

  if (error) {
    console.error("Error deleting address:", error);
    return false;
  }

  return true;
}

export async function setDefaultAddress(addressId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // First, unset all other default addresses for this customer
  const { error: unsetError } = await supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", user.id)
    .eq("is_default", true)
    .neq("id", addressId);

  if (unsetError) {
    console.error("Error unsetting other defaults:", unsetError);
    // Continue anyway - try to set the new default
  }

  // Then set this address as default
  return await updateAddress(addressId, { is_default: true });
}

export function createAddressSnapshot(address: CustomerAddress): AddressSnapshot {
  return {
    label: address.label,
    icon: address.icon,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    latitude: address.latitude,
    longitude: address.longitude,
    custom_pin_lat: address.custom_pin_lat,
    custom_pin_lng: address.custom_pin_lng
  };
}

export function formatAddress(address: CustomerAddress | AddressSnapshot): string {
  const parts = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal_code}`
  ].filter(Boolean);
  
  return parts.join(", ");
}

/**
 * Get the primary line for address display (label or street address)
 * - If label exists → return label
 * - If label missing → return line1 (street address)
 */
export function getAddressPrimaryLine(address: CustomerAddress | AddressSnapshot): string {
  return address.label || address.line1 || 'Address';
}

/**
 * Get the secondary line for address display
 * - If label exists → return full address (line1, city, state)
 * - If label missing → return city, state only
 */
export function getAddressSecondaryLine(address: CustomerAddress | AddressSnapshot): string {
  if (address.label) {
    // If label exists, show full address in secondary line
    const parts = [
      address.line1,
      address.line2,
      `${address.city}, ${address.state}`
    ].filter(Boolean);
    return parts.join(", ");
  } else {
    // If no label, show only city, state
    return `${address.city}, ${address.state}`;
  }
}

// Order APIs
export async function createOrder(
  requestedAmount: number,
  customerAddress: string,
  customerNotes?: string,
  addressId?: string,
  deliveryStyle?: 'COUNTED' | 'SPEED'
): Promise<Order | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch customer profile to get their name and daily usage
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, daily_usage, daily_limit")
    .eq("id", user.id)
    .maybeSingle();

  // Construct customer name from profile, with fallback
  const customerName = profile && (profile.first_name || profile.last_name)
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : 'Customer';

  const fees = calculateFees(requestedAmount);

  // If addressId is provided, fetch the address and create snapshot
  let addressSnapshot: AddressSnapshot | null = null;
  let atmSelection: { atmId: string; atmName: string | null; atmAddress: string | null; atmLat: number; atmLng: number; distanceMeters: number; score?: number } | null = null;
  
  if (addressId) {
    const address = await getAddressById(addressId);
    if (address) {
      addressSnapshot = createAddressSnapshot(address);
      
      // Select ATM for this address - coordinates are required
      if (!address.latitude || !address.longitude) {
        console.error('[ORDER_CREATE][ATM_MISSING] Address missing coordinates', {
          addressId: addressId,
          line1: address.line1,
          city: address.city,
          hasLatitude: !!address.latitude,
          hasLongitude: !!address.longitude,
          latitude: address.latitude,
          longitude: address.longitude,
        });
        // Throw an error so we don't silently create an order with missing coordinates
        throw new Error(`Address ${addressId} (${address.line1}, ${address.city}) is missing coordinates. Please update the address with valid latitude and longitude.`);
      }

      try {
        const { selectBestAtmForAddress } = await import('@/lib/atm/selectBestAtmForAddress');
        atmSelection = await selectBestAtmForAddress({
          addressId: addressId,
          addressLat: address.latitude,
          addressLng: address.longitude,
        });
        
        if (atmSelection) {
          console.log('[ORDER_CREATE] ATM selection result', {
            addressId: addressId,
            atmId: atmSelection.atmId,
            atmName: atmSelection.atmName,
            pickup_lat: atmSelection.atmLat,
            pickup_lng: atmSelection.atmLng,
            distanceMeters: atmSelection.distanceMeters,
            score: atmSelection.score,
          });
        } else {
          console.warn('[ORDER_CREATE][ATM_MISSING] No ATM found for address', {
            addressId: addressId,
            addressLat: address.latitude,
            addressLng: address.longitude,
          });
        }
      } catch (error) {
        console.error('[ORDER_CREATE][ATM_ERROR] Failed to select ATM:', error);
        // Re-throw the error so order creation fails if coordinates are missing
        // This ensures we never create orders with invalid ATM selections
        throw error;
      }
    }
  }

  // Build insert payload - conditionally include delivery_style for backward compatibility
  const insertPayload: Record<string, any> = {
    customer_id: user.id,
    requested_amount: fees.requestedAmount,
    profit: fees.profit,
    compliance_fee: fees.complianceFee,
    delivery_fee: fees.deliveryFee,
    total_service_fee: fees.totalServiceFee,
    total_payment: fees.totalPayment,
    address_id: addressId || null,
    address_snapshot: addressSnapshot,
    customer_address: customerAddress, // Legacy field for backward compatibility
    customer_name: customerName,
    customer_notes: customerNotes || null,
    status: "Pending"
  };

  // Include ATM selection if available
  if (atmSelection) {
    insertPayload.atm_id = atmSelection.atmId;
    insertPayload.atm_distance_meters = atmSelection.distanceMeters;
    insertPayload.pickup_name = atmSelection.atmName || null;
    insertPayload.pickup_address = atmSelection.atmAddress || null;
    insertPayload.pickup_lat = atmSelection.atmLat;
    insertPayload.pickup_lng = atmSelection.atmLng;
    
    console.log('[ORDER_CREATE] Including ATM in insert payload:', {
      atm_id: insertPayload.atm_id,
      pickup_name: insertPayload.pickup_name,
      pickup_address: insertPayload.pickup_address,
      pickup_lat: insertPayload.pickup_lat,
      pickup_lng: insertPayload.pickup_lng,
    });
  } else {
    console.warn('[ORDER_CREATE] Order will be created WITHOUT ATM assignment');
  }

  // Include delivery_style if provided (will be omitted if column doesn't exist yet)
  if (deliveryStyle) {
    insertPayload.delivery_style = deliveryStyle;
    console.log("[Order Creation] 📝 Including delivery_style in insert payload:", deliveryStyle);
  } else {
    console.warn("[Order Creation] ⚠️ No deliveryStyle provided to createOrder!");
  }

  let { data, error } = await supabase
    .from("orders")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  // Log ATM selection result after order creation
  if (data && atmSelection) {
    console.log('[ORDER_CREATE] ATM selection result', {
      orderId: data.id,
      atmId: atmSelection.atmId,
      atmName: atmSelection.atmName,
      pickup_lat: atmSelection.atmLat,
      pickup_lng: atmSelection.atmLng,
      distanceMeters: atmSelection.distanceMeters,
    });
  }

  // If error is due to missing delivery_style column, retry without it (backward compatibility)
  if (error && error.message?.includes("delivery_style")) {
    console.error("[Order Creation] ❌ CRITICAL: delivery_style column does not exist in database!");
    console.error("[Order Creation] ❌ Error details:", error.message);
    console.error("[Order Creation] ❌ ACTION REQUIRED: Run migration 20251126_add_delivery_style_to_orders.sql");
    console.warn("[Order Creation] ⚠️ Retrying without delivery_style (order will default to Speed)");
    const { delivery_style, ...payloadWithoutStyle } = insertPayload;
    const retryResult = await supabase
      .from("orders")
      .insert(payloadWithoutStyle)
      .select()
      .maybeSingle();
    
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    console.error("[Order Creation] ❌ Error creating order:", error);
    throw error;
  }

  if (data) {
    console.log("[Order Creation] ✅ Order created successfully:", {
      orderId: data.id,
      status: data.status,
      runnerId: data.runner_id,
      requestedAmount: data.requested_amount,
      customerId: data.customer_id,
      deliveryStyle: data.delivery_style || 'NOT SET',
      deliveryMode: data.delivery_mode || 'NOT SET',
      timestamp: new Date().toISOString(),
    });
    console.log("[Order Creation] 📡 This order should now be available to runners via Realtime");
    
    // Warn if delivery_style was not saved
    if (deliveryStyle && !data.delivery_style) {
      console.warn("[Order Creation] ⚠️ WARNING: delivery_style was provided but not saved to database!", {
        provided: deliveryStyle,
        saved: data.delivery_style,
      });
    }

    // Update daily_usage by adding the requested amount
    if (profile) {
      const currentDailyUsage = Number(profile.daily_usage) || 0;
      const newDailyUsage = currentDailyUsage + requestedAmount;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          daily_usage: newDailyUsage,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("[Order Creation] ❌ Error updating daily_usage:", updateError);
        // Don't throw - order was created successfully, this is just a tracking update
      } else {
        console.log("[Order Creation] ✅ Updated daily_usage:", {
          previous: currentDailyUsage,
          added: requestedAmount,
          new: newDailyUsage,
          dailyLimit: profile.daily_limit || 1000,
        });
      }
    }
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

/**
 * Get runner order history including Completed, Skipped, Missed, and Cancelled orders
 * Completed orders come from orders table, Skipped/Missed from runner_offer_events
 */
export async function getRunnerOrderHistory(): Promise<Array<OrderWithDetails & { historyStatus: 'Completed' | 'Skipped' | 'Missed' | 'Cancelled' }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const history: Array<OrderWithDetails & { historyStatus: 'Completed' | 'Skipped' | 'Missed' | 'Cancelled' }> = [];

  // Get all terminal status orders (Completed, Cancelled)
  const { data: terminalOrders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customer_id(*),
      runner:runner_id(*)
    `)
    .eq("runner_id", user.id)
    .in("status", ["Completed", "Cancelled"])
    .order("created_at", { ascending: false });

  if (!ordersError && terminalOrders) {
    terminalOrders.forEach(order => {
      const historyStatus = order.status === 'Completed' 
        ? 'Completed' as const 
        : 'Cancelled' as const;
      
      history.push({
        ...order,
        historyStatus
      });
    });
  }

  // Get skipped and missed orders from runner_offer_events
  // Use runner_offer_events as the single source of truth - always include events even if order data is inaccessible
  try {
    const { data: offerEvents, error: eventsError } = await supabase
      .from('runner_offer_events')
      .select('offer_id, event, created_at')
      .eq('runner_id', user.id)
      .in('event', ['skipped', 'timeout'])
      .order('created_at', { ascending: false });

    if (eventsError) {
      // Log error but don't fail completely
      console.warn('[getRunnerOrderHistory] Error fetching runner offer events:', eventsError);
      // If table doesn't exist (42P01), that's okay - gracefully degrade
      if (eventsError.code !== '42P01' && eventsError.code !== 'PGRST116') {
        // For other errors, log them but continue
        console.error('[getRunnerOrderHistory] Unexpected error:', eventsError);
      }
    } else if (offerEvents && offerEvents.length > 0) {
      console.log(`[getRunnerOrderHistory] Found ${offerEvents.length} offer events for runner`);
      
      // Group events by order ID and get the most recent event for each order
      const orderEventMap = new Map<string, { offer_id: string; event: string; created_at: string }>();
      offerEvents.forEach(event => {
        const existing = orderEventMap.get(event.offer_id);
        if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
          orderEventMap.set(event.offer_id, event);
        }
      });

      const uniqueOrderEvents = Array.from(orderEventMap.values());
      console.log(`[getRunnerOrderHistory] Unique order events:`, uniqueOrderEvents.length);
      
      // Get unique order IDs from events
      const orderIds = [...new Set(uniqueOrderEvents.map(e => e.offer_id))];
      console.log(`[getRunnerOrderHistory] Unique order IDs from events:`, orderIds);
      
      // Exclude orders that are already in history (Completed/Cancelled)
      const existingOrderIds = new Set(history.map(h => h.id));
      const newOrderIds = orderIds.filter(id => !existingOrderIds.has(id));
      console.log(`[getRunnerOrderHistory] New order IDs (not in history):`, newOrderIds);
      
      if (newOrderIds.length > 0) {
        // Try to fetch order details for skipped/missed orders
        // Use multiple queries if needed to handle RLS restrictions
        const skippedOrders: OrderWithDetails[] = [];
        const inaccessibleOrderIds: string[] = [];

        // Try to fetch all orders at once first
        const { data: fetchedOrders, error: skippedError } = await supabase
          .from("orders")
          .select(`
            *,
            customer:customer_id(*),
            runner:runner_id(*)
          `)
          .in("id", newOrderIds);

        if (skippedError) {
          console.warn('[getRunnerOrderHistory] Error fetching skipped orders (may be RLS restricted):', skippedError);
        }

        if (fetchedOrders) {
          skippedOrders.push(...fetchedOrders);
        }

        // Identify which orders we couldn't fetch (due to RLS or deletion)
        const fetchedOrderIds = new Set(fetchedOrders?.map(o => o.id) || []);
        inaccessibleOrderIds.push(...newOrderIds.filter(id => !fetchedOrderIds.has(id)));

        // Process successfully fetched orders
        skippedOrders.forEach(order => {
          const event = orderEventMap.get(order.id);
          if (event) {
            const historyStatus = event.event === 'timeout' 
              ? 'Missed' as const 
              : 'Skipped' as const;
            
            history.push({
              ...order,
              historyStatus
            });
          }
        });

        // For inaccessible orders, create minimal history entries from event data
        // This ensures orders don't disappear from history even if they become inaccessible
        inaccessibleOrderIds.forEach(orderId => {
          const event = orderEventMap.get(orderId);
          if (event) {
            const historyStatus = event.event === 'timeout' 
              ? 'Missed' as const 
              : 'Skipped' as const;
            
            // Create a minimal order object from event data
            // Use event.created_at as created_at since we don't have order data
            const minimalOrder: OrderWithDetails & { historyStatus: 'Skipped' | 'Missed' } = {
              id: orderId,
              requested_amount: 0, // Will be hidden in UI anyway
              status: 'Pending' as any, // Placeholder
              created_at: event.created_at, // Use event timestamp as fallback
              updated_at: event.created_at,
              historyStatus,
              customer_id: '', // Placeholder
              runner_id: null,
              // Add other required fields as placeholders
              profit: 0,
              compliance_fee: 0,
              delivery_fee: 0,
              total_service_fee: 0,
              total_payment: 0,
              address_id: null,
              address_snapshot: null,
              customer_address: null,
              customer_name: 'Customer',
              customer_notes: null,
              delivery_mode: null,
              delivery_style: null,
              otp_code: null,
              otp_hash: null,
              otp_expires_at: null,
              otp_attempts: 0,
              otp_verified_at: null,
              runner_accepted_at: null,
              runner_at_atm_at: null,
              cash_withdrawn_at: null,
              handoff_completed_at: null,
              cancelled_at: null,
              cancelled_by: null,
              cancellation_reason: null,
              runner_rating: null,
              runner_rating_comment: null,
              customer_rating_by_runner: null,
              customer_rating_tags: null,
              atm_id: null,
              atm_distance_meters: null,
              pickup_name: null,
              pickup_address: null,
              pickup_lat: null,
              pickup_lng: null,
              customer: undefined,
              runner: undefined,
            };

            history.push(minimalOrder);
          }
        });

        console.log(`[getRunnerOrderHistory] Added ${skippedOrders.length} skipped/missed orders with full data, ${inaccessibleOrderIds.length} with event data only`);
      }
    } else {
      console.log('[getRunnerOrderHistory] No offer events found for runner');
    }
  } catch (error) {
    // Table might not exist, gracefully degrade
    console.warn('[getRunnerOrderHistory] Exception fetching runner offer events:', error);
  }

  // Sort by created_at descending (most recent first)
  return history.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
    .is("runner_id", null)
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
  
  // Ensure pickup fields are included (they should be in * but explicitly check)
  if (data && !('pickup_lat' in data)) {
    console.warn('[getOrderById] Order missing pickup fields, fetching explicitly');
    const { data: fullData } = await supabase
      .from("orders")
      .select("atm_id, pickup_name, pickup_address, pickup_lat, pickup_lng, atm_distance_meters")
      .eq("id", orderId)
      .maybeSingle();
    if (fullData) {
      Object.assign(data, fullData);
    }
  }

  if (error) {
    console.error("Error fetching order:", error);
    return null;
  }

  // Debug logging in development
  if (import.meta.env.DEV && data) {
    console.log('[getOrderById] Fetched order:', {
      orderId: data.id,
      hasCustomer: !!data.customer,
      hasRunner: !!data.runner,
      customerId: data.customer_id,
      runnerId: data.runner_id,
      deliveryStyle: data.delivery_style || 'NOT SET',
      deliveryMode: data.delivery_mode || 'NOT SET',
      pickup_lat: (data as any).pickup_lat,
      pickup_lng: (data as any).pickup_lng,
      pickup_address: (data as any).pickup_address,
      atm_id: (data as any).atm_id,
      customerData: data.customer ? {
        id: data.customer.id,
        avatar_url: data.customer.avatar_url,
        first_name: data.customer.first_name
      } : null,
      runnerData: data.runner ? {
        id: data.runner.id,
        avatar_url: data.runner.avatar_url,
        first_name: data.runner.first_name
      } : null,
    });
  }

  return data;
}

export async function acceptOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is a runner
    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('runner')) {
      return { success: false, error: "Unauthorized: Only runners can accept orders" };
    }

    // Get the order to verify it exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      return { success: false, error: "Failed to fetch order" };
    }

    if (!existingOrder) {
      return { success: false, error: "Order not found" };
    }

    // Check if order is already accepted or not in Pending status
    if (existingOrder.status !== "Pending") {
      return { 
        success: false, 
        error: `Order is not available. Current status: ${existingOrder.status}` 
      };
    }

    if (existingOrder.runner_id) {
      return { 
        success: false, 
        error: "Order has already been accepted by another runner" 
      };
    }

    // Use FSM RPC to accept the order (this handles state transitions properly and prevents race conditions)
    const { data: updatedOrder, error: fsmError } = await supabase.rpc('rpc_advance_order', {
      p_order_id: orderId,
      p_next_status: 'Runner Accepted',
      p_metadata: {
        accepted_by: user.id,
        accepted_at: new Date().toISOString()
      }
    });

    if (fsmError) {
      console.error("Error accepting order via FSM:", fsmError);
      
      // Provide user-friendly error messages
      const errorMessage = fsmError.message || `Failed to accept order: ${JSON.stringify(fsmError)}`;
      
      // Map common FSM errors to user-friendly messages
      if (errorMessage.includes('Illegal transition')) {
        return { 
          success: false, 
          error: "Order is no longer available. It may have been accepted by another runner." 
        };
      }
      if (errorMessage.includes('already been accepted')) {
        return { 
          success: false, 
          error: "This order has already been accepted by another runner." 
        };
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }

    if (!updatedOrder) {
      return { 
        success: false, 
        error: "Order may have been accepted by another runner. Please refresh and try again." 
      };
    }

    // Create audit log entry
    await createAuditLog(
      "ACCEPT_ORDER",
      "order",
      orderId,
      { status: "Pending", runner_id: null },
      { 
        status: "Runner Accepted", 
        runner_id: user.id,
        runner_accepted_at: updatedOrder.runner_accepted_at || new Date().toISOString()
      }
    );

    console.log("Order accepted successfully:", {
      orderId,
      runnerId: user.id,
      newStatus: updatedOrder.status,
      timestamp: updatedOrder.runner_accepted_at
    });

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in acceptOrder:", error);
    return { 
      success: false, 
      error: error?.message || "An unexpected error occurred" 
    };
  }
}

// Note: updateOrderStatus has been moved to FSM section below (line ~864)
// It now uses advanceOrderStatus for proper FSM validation

export async function generateOTP(orderId: string): Promise<string | null> {
  try {
    // Generate OTP using helper (4-digit numeric)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    // MVP: Set expiry far in the future (1 year) - OTPs valid until order completion
    // TODO: Set proper expiry (e.g., 15 minutes) for production
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now (effectively no expiry)

    // Advance to "Pending Handoff" using FSM (status should be "Cash Withdrawn" at this point)
    // This represents: OTP Generated → Enroute Customer (logical states, DB uses "Pending Handoff")
    const updatedOrder = await advanceOrderStatus(
      orderId,
      "Pending Handoff",
      undefined,
      {
        action: "generate_otp",
        otp_generated: true
      }
    );

    if (!updatedOrder) {
      console.error("Failed to advance order status to Pending Handoff");
      return null;
    }

    // Update OTP fields directly (FSM doesn't handle these fields)
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        otp_code: otp,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0,
        // TODO: When DB supports otp_verified_at, initialize it as null here
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating OTP fields:", updateError);
      // OTP was generated and status was updated, so return it even if field update failed
      // In dev, warn if column doesn't exist
      if (import.meta.env.DEV && (updateError.message?.includes('otp_code') || updateError.message?.includes('column'))) {
        console.warn('[OTP] OTP fields may not exist in database. Run migration to add otp_code, otp_expires_at columns.');
      }
    }

    return otp;
  } catch (error) {
    console.error("Error generating OTP:", error);
    return null;
  }
}

/**
 * Mark runner as arrived at customer location
 * 
 * Creates an order event to track runner arrival.
 * This allows customers to see "Arrived" status.
 */
export async function markRunnerArrived(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get order to verify runner
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, runner_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    if (order.runner_id !== user.id) {
      return { success: false, error: "Only the assigned runner can mark arrival" };
    }

    if (order.status !== "Pending Handoff") {
      return { success: false, error: "Can only mark arrival when status is Pending Handoff" };
    }

    // Create order event to track arrival
    const { error: eventError } = await supabase
      .from("order_events")
      .insert({
        order_id: orderId,
        from_status: order.status,
        to_status: order.status, // Status doesn't change, just tracking arrival
        actor_id: user.id,
        actor_role: "runner",
        client_action_id: "runner_arrived",
        metadata: { action: "runner_arrived", timestamp: new Date().toISOString() }
      });

    if (eventError) {
      console.error("Error creating arrival event:", eventError);
      // If order_events table doesn't exist, silently fail (graceful degradation)
      if (import.meta.env.DEV && (eventError.code === '42P01' || eventError.message?.includes('does not exist'))) {
        console.warn('[Runner Arrival] order_events table may not exist. Arrival tracking may not work.');
      }
      // Still return success since the main action (marking arrival) is conceptual
      // The event is just for tracking/audit
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error marking runner as arrived:", error);
    return { success: false, error: error?.message || "Failed to mark arrival" };
  }
}

export async function verifyOTP(orderId: string, otp: string): Promise<{ success: boolean; error?: string; requiresCountConfirmation?: boolean }> {
  try {
    // Fetch order - use select("*") to get all available columns gracefully
    // This handles cases where OTP columns might not exist yet
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching order for OTP verification:", fetchError);
      // Provide more specific error message based on error code
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: "Order not found. Please contact support." };
      }
      if (fetchError.code === '42501' || fetchError.message?.includes('permission')) {
        return { success: false, error: "Permission denied. Please contact support." };
      }
      if (fetchError.code === '42703' || fetchError.message?.includes('column')) {
        // Column doesn't exist - this shouldn't happen with select("*"), but handle it
        if (import.meta.env.DEV) {
          console.warn('[OTP] Database schema issue. Some columns may be missing.');
        }
        return { success: false, error: "Database error. Please contact support." };
      }
      // Log full error in dev for debugging
      if (import.meta.env.DEV) {
        console.error('[OTP] Full fetch error:', { code: fetchError.code, message: fetchError.message, details: fetchError });
      }
      return { success: false, error: "Failed to verify code. Please try again." };
    }

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    // Check if OTP fields exist (graceful degradation)
    // Handle cases where columns might not exist in the database yet
    const otpCode = (order as any).otp_code;
    const otpExpiresAt = (order as any).otp_expires_at;
    const otpAttempts = (order as any).otp_attempts || 0;
    const otpVerifiedAt = (order as any).otp_verified_at;

    if (!otpCode || !otpExpiresAt) {
      if (import.meta.env.DEV) {
        console.warn('[OTP] OTP fields not found. Order may not have OTP generated yet.', { orderId, hasOtpCode: !!otpCode, hasOtpExpiresAt: !!otpExpiresAt });
      }
      return { success: false, error: "Verification code not available. Please contact support." };
    }

    // Check if already verified
    if (otpVerifiedAt) {
      return { success: false, error: "This code has already been used." };
    }

    // MVP: Skip expiry check - OTPs valid until order completion
    // TODO: Re-enable expiry validation for production
    // if (new Date(otpExpiresAt) < new Date()) {
    //   return { success: false, error: "Code expired. Please contact support." };
    // }

    // Check attempt limit
    if (otpAttempts >= 3) {
      return { success: false, error: "Too many incorrect attempts. Please contact support." };
    }

    // Verify OTP code
    if (otpCode !== otp) {
      // Increment attempt counter (only if column exists)
      try {
        await supabase
          .from("orders")
          .update({ otp_attempts: otpAttempts + 1 })
          .eq("id", orderId);
      } catch (updateError: any) {
        // Silently fail if otp_attempts column doesn't exist
        if (import.meta.env.DEV && updateError.message?.includes('otp_attempts')) {
          console.warn('[OTP] otp_attempts column may not exist. Skipping attempt counter update.');
        }
      }
      return { success: false, error: "Incorrect code. Please try again." };
    }

    // Check delivery style to determine flow (source of truth is delivery_style, with fallback to delivery_mode)
    const deliveryStyle = (order as any).delivery_style;
    const deliveryMode = (order as any).delivery_mode; // Legacy fallback
    
    // Determine if this is COUNTED mode (check delivery_style first, then fallback to delivery_mode)
    const isCounted = deliveryStyle === 'COUNTED' || (deliveryStyle !== 'SPEED' && deliveryMode === 'count_confirm');

    // OTP is correct - update verified_at timestamp
    const otpVerifiedTimestamp = new Date().toISOString();
    try {
      // First, try to update without select to see if update works
      const { error: updateError } = await supabase
        .from("orders")
        .update({ otp_verified_at: otpVerifiedTimestamp })
        .eq("id", orderId);

      if (updateError) {
        // Log all errors - this is critical for counted delivery mode
        console.error('[OTP] ❌ Error updating otp_verified_at:', {
          orderId,
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // If column doesn't exist (42703 = undefined_column), this is a schema issue
        if (updateError.code === '42703' || updateError.message?.includes('otp_verified_at') || updateError.message?.includes('column')) {
          console.error('[OTP] ❌ otp_verified_at column does not exist in database. Please run migration: 20251126_add_otp_verified_at_to_orders.sql');
          // For counted mode, we MUST have this column - return error
          if (isCounted) {
            return { success: false, error: "Database configuration error. Please contact support." };
          }
        } else {
          // Other errors - log and fail for counted mode
          if (isCounted) {
            return { success: false, error: `Failed to record OTP verification: ${updateError.message}` };
          }
        }
      } else {
        // Update succeeded - verify by fetching the order
        const { data: verifyOrder, error: verifyError } = await supabase
          .from("orders")
          .select('id, otp_verified_at')
          .eq("id", orderId)
          .single();

        if (verifyError) {
          console.error('[OTP] ⚠️ Update succeeded but failed to verify:', {
            orderId,
            verifyError
          });
          // Even if verification fails, the update likely succeeded, so continue
        } else {
          const verifiedAt = (verifyOrder as any)?.otp_verified_at;
          if (verifiedAt) {
            console.log('[OTP] ✅ otp_verified_at updated and verified successfully:', {
              orderId,
              otp_verified_at: verifiedAt
            });
          } else {
            console.warn('[OTP] ⚠️ Update succeeded but otp_verified_at is still null in fetched order:', {
              orderId,
              verifyOrder
            });
            // For counted mode, this is a problem
            if (isCounted) {
              return { success: false, error: "OTP verification was not properly recorded. Please try again." };
            }
          }
        }
      }
    } catch (updateError: any) {
      console.error('[OTP] Exception updating otp_verified_at:', {
        orderId,
        error: updateError,
        message: updateError?.message,
        stack: updateError?.stack
      });
      if (isCounted) {
        return { success: false, error: "Failed to record OTP verification. Please try again." };
      }
    }

    // For "Speed" mode: Complete immediately
    // For "Counted" mode: Stay in Pending Handoff, wait for count confirmation
    if (isCounted) {
      // Counted mode: OTP verified, but stay in Pending Handoff
      // Runner will need to confirm count separately
      return { success: true, requiresCountConfirmation: true };
    } else {
      // Speed mode (default): Complete the order immediately
      const updatedOrder = await advanceOrderStatus(
        orderId,
        "Completed",
        undefined,
        {
          action: "verify_otp",
          otp_verified: true,
          otp_code: otp // Include OTP in metadata for audit
        }
      );

      if (!updatedOrder) {
        return { success: false, error: "Failed to complete delivery. Please contact support." };
      }

      return { success: true };
    }

    // Default: Complete the order (backward compatibility)
    const updatedOrder = await advanceOrderStatus(
      orderId,
      "Completed",
      undefined,
      {
        action: "verify_otp",
        otp_verified: true,
        otp_code: otp
      }
    );

    if (!updatedOrder) {
      return { success: false, error: "Failed to complete delivery. Please contact support." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Confirm customer count for counted delivery mode
 * This completes the order after OTP has been verified and customer has counted
 * 
 * @param orderId - Order ID
 * @returns Success status
 */
export async function confirmCount(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch order to verify it's in the right state
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return { success: false, error: "Order not found." };
    }

    // Verify order is in Pending Handoff with OTP verified
    if (order.status !== "Pending Handoff") {
      return { success: false, error: "Order is not in the correct state for count confirmation." };
    }

    const otpVerifiedAt = (order as any).otp_verified_at;
    if (!otpVerifiedAt) {
      return { success: false, error: "OTP must be verified before confirming count." };
    }

    // Use the same resolver as the UI to check delivery style
    const { resolveDeliveryStyleFromOrder } = await import('@/lib/deliveryStyle');
    const style = resolveDeliveryStyleFromOrder(order);
    if (style !== 'COUNTED') {
      return { success: false, error: "Count confirmation is only required for counted delivery mode." };
    }

    // Complete the order
    const updatedOrder = await advanceOrderStatus(
      orderId,
      "Completed",
      undefined,
      {
        action: "confirm_count",
        count_verified: true
      }
    );

    if (!updatedOrder) {
      return { success: false, error: "Failed to complete delivery. Please contact support." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error confirming count:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

// Cancel an order (supports both customer and admin cancellation via FSM)
export async function cancelOrder(orderId: string, reason: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    // Get user profile to check role
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, message: "User profile not found" };
    }

    const isAdmin = profile.role.includes('admin');
    const isCustomer = profile.role.includes('customer');

    // Get the order to verify it exists and check ownership
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      return { success: false, message: "Failed to fetch order" };
    }

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Check if order is already cancelled or completed
    if (order.status === 'Cancelled') {
      return { success: false, message: "Order is already cancelled" };
    }

    if (order.status === 'Completed') {
      return { success: false, message: "Cannot cancel a completed order" };
    }

    // Authorization checks
    if (isCustomer) {
      // Customers can only cancel their own orders
      if (order.customer_id !== user.id) {
        return { success: false, message: "You can only cancel your own orders" };
      }
      // Customers can only cancel from Pending or Runner Accepted status
      // (FSM will enforce this, but we can provide a better error message)
      if (order.status !== 'Pending' && order.status !== 'Runner Accepted') {
        return { success: false, message: "Cannot cancel order at this stage" };
      }
    } else if (!isAdmin) {
      // Only customers and admins can cancel orders
      return { success: false, message: "Unauthorized: Only customers and admins can cancel orders" };
    }

    // Use FSM to cancel the order (this handles state transitions properly)
    // FSM will validate:
    // - Customers can cancel their own orders from Pending/Runner Accepted
    // - Admins can cancel from any status (except Completed, which we already checked)
    const { error: fsmError } = await supabase.rpc('rpc_advance_order', {
      p_order_id: orderId,
      p_next_status: 'Cancelled',
      p_metadata: {
        reason: reason,
        cancelled_by: user.id
      }
    });

    if (fsmError) {
      console.error("Error cancelling order via FSM:", fsmError);
      console.error("FSM Error details:", JSON.stringify(fsmError, null, 2));
      console.error("Order status:", order.status);
      console.error("User role:", profile.role);
      console.error("Is customer:", isCustomer);
      console.error("Is admin:", isAdmin);
      console.error("Order customer_id:", order.customer_id);
      console.error("Current user id:", user.id);
      
      // Provide user-friendly error messages
      const errorMessage = fsmError.message || `Failed to cancel order: ${JSON.stringify(fsmError)}`;
      
      // Map common FSM errors to user-friendly messages
      if (errorMessage.includes('Illegal transition')) {
        return { success: false, message: "Cannot cancel order at this stage" };
      }
      if (errorMessage.includes('can only cancel your own orders')) {
        return { success: false, message: "You can only cancel your own orders" };
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }

    // Create audit log entry
    await createAuditLog(
      "CANCEL_ORDER",
      "order",
      orderId,
      { status: order.status },
      { 
        status: 'Cancelled', 
        cancelled_by: user.id, 
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      }
    );

    return { success: true, message: "Order cancelled successfully" };
  } catch (error: any) {
    console.error("Error in cancelOrder:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
}

export async function updateRunnerOnlineStatus(isOnline: boolean): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is a runner
    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('runner')) {
      return { success: false, error: "Unauthorized: Runner access required" };
    }

    // Defensive check: Prevent going offline if runner has active deliveries
    if (!isOnline) {
      const { data: activeOrders, error: activeErr } = await supabase
        .from('orders')
        .select('id, status')
        .eq('runner_id', user.id)
        .not('status', 'in', '("Completed","Cancelled")')
        .limit(1);

      if (activeErr) {
        console.error('[updateRunnerOnlineStatus] Error checking active jobs before offline:', activeErr);
        // Fail safe: do NOT force offline on error - this prevents data inconsistency
        return { 
          success: false, 
          error: "Unable to go offline right now. Please try again." 
        };
      }

      if (activeOrders && activeOrders.length > 0) {
        // Server-side enforcement: runner has active delivery
        return { 
          success: false, 
          error: "You have an active delivery. Complete it before going offline." 
        };
      }
    }

    // Update is_online status
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_online: isOnline })
      .eq("id", user.id)
      .select("is_online")
      .single();

    if (error) {
      // Check if it's a column missing error
      const errorMessage = error.message || '';
      if (errorMessage.includes("is_online") || errorMessage.includes("schema cache")) {
        // In dev: log warning and no-op gracefully
        if (import.meta.env.DEV) {
          console.warn(
            "[updateRunnerOnlineStatus] is_online column not found. " +
            "This feature requires a database migration. " +
            "See ADD_IS_ONLINE_COLUMN.sql or FIX_RUNNER_ONLINE_TOGGLE.md for instructions."
          );
          // Return success to prevent UI errors, but log the issue
          return { success: true, error: undefined, data: { is_online: false } };
        }
        return { 
          success: false, 
          error: "Database configuration issue. The is_online column is missing. Please contact support." 
        };
      }
      return { success: false, error: error.message || "Failed to update online status" };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in updateRunnerOnlineStatus:", error);
    const errorMessage = error?.message || "An unexpected error occurred";
    
    // Handle missing column gracefully in dev
    if (import.meta.env.DEV && (errorMessage.includes("is_online") || errorMessage.includes("schema cache"))) {
      console.warn("[updateRunnerOnlineStatus] Column missing - no-op in dev mode");
      return { success: true, error: undefined, data: { is_online: false } };
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function getRunnerEarningsStats(): Promise<{
  monthlyEarnings: number;
  activeDeliveries: number;
  completedThisMonth: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { monthlyEarnings: 0, activeDeliveries: 0, completedThisMonth: 0 };
  }

  // Get all runner orders
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("runner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching runner orders for earnings:", error);
    return { monthlyEarnings: 0, activeDeliveries: 0, completedThisMonth: 0 };
  }

  if (!orders || orders.length === 0) {
    return { monthlyEarnings: 0, activeDeliveries: 0, completedThisMonth: 0 };
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Active deliveries (in-progress statuses)
  const activeStatuses = ['Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];
  const activeDeliveries = orders.filter(o => 
    activeStatuses.includes(o.status)
  ).length;

  // Completed orders this month
  const completedThisMonth = orders.filter(o => {
    if (o.status !== 'Completed') return false;
    
    const completedDate = o.handoff_completed_at 
      ? new Date(o.handoff_completed_at)
      : new Date(o.updated_at);
    
    return (
      completedDate.getMonth() === currentMonth &&
      completedDate.getFullYear() === currentYear
    );
  });

  // Calculate monthly earnings from completed orders
  const monthlyEarnings = completedThisMonth.reduce((total, order) => {
    return total + (order.delivery_fee || 0);
  }, 0);

  return {
    monthlyEarnings,
    activeDeliveries,
    completedThisMonth: completedThisMonth.length,
  };
}

export async function getRunnerStatsForAdmin(runnerId: string): Promise<{
  activeDeliveries: number;
  completedThisMonth: number;
  monthlyEarnings: number;
  totalCompleted: number;
  totalEarnings: number;
  acceptedCount: number;
  skippedCount: number;
  timedOutCount: number;
}> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("runner_id", runnerId)
    .order("created_at", { ascending: false });

  // Get accepted/skipped/timed-out counts from runner_offer_events
  let acceptedCount = 0;
  let skippedCount = 0;
  let timedOutCount = 0;
  
  try {
    const { data: events, error: eventsError } = await supabase
      .from('runner_offer_events')
      .select('event')
      .eq('runner_id', runnerId);
    
    if (!eventsError && events) {
      acceptedCount = events.filter(e => e.event === 'accepted').length;
      skippedCount = events.filter(e => e.event === 'skipped').length;
      timedOutCount = events.filter(e => e.event === 'timeout').length;
    }
  } catch (error) {
    // Table might not exist, gracefully degrade
    console.warn('Error fetching runner offer events:', error);
  }

  if (error) {
    console.error("Error fetching runner orders for admin:", error);
    return {
      activeDeliveries: 0,
      completedThisMonth: 0,
      monthlyEarnings: 0,
      totalCompleted: 0,
      totalEarnings: 0,
      acceptedCount,
      skippedCount,
      timedOutCount,
    };
  }

  if (!orders || orders.length === 0) {
    return {
      activeDeliveries: 0,
      completedThisMonth: 0,
      monthlyEarnings: 0,
      totalCompleted: 0,
      totalEarnings: 0,
      acceptedCount,
      skippedCount,
      timedOutCount,
    };
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Active deliveries (in-progress statuses)
  const activeStatuses = ['Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff'];
  const activeDeliveries = orders.filter(o => activeStatuses.includes(o.status)).length;

  // Completed orders
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalCompleted = completedOrders.length;

  // Completed this month
  const completedThisMonth = completedOrders.filter(o => {
    const completedDate = o.handoff_completed_at 
      ? new Date(o.handoff_completed_at)
      : new Date(o.updated_at);
    return (
      completedDate.getMonth() === currentMonth &&
      completedDate.getFullYear() === currentYear
    );
  });

  // Calculate earnings
  const monthlyEarnings = completedThisMonth.reduce((total, order) => {
    return total + (order.delivery_fee || 0);
  }, 0);

  const totalEarnings = completedOrders.reduce((total, order) => {
    return total + (order.delivery_fee || 0);
  }, 0);

  return {
    activeDeliveries,
    completedThisMonth: completedThisMonth.length,
    monthlyEarnings,
    totalCompleted,
    totalEarnings,
    acceptedCount,
    skippedCount,
    timedOutCount,
  };
}

export async function getCustomerStatsForAdmin(customerId: string): Promise<{
  activeOrders: number;
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
}> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer orders for admin:", error);
    return {
      activeOrders: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalSpent: 0,
    };
  }

  if (!orders || orders.length === 0) {
    return {
      activeOrders: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalSpent: 0,
    };
  }

  // Active orders (non-final statuses)
  const finalStatuses = ['Completed', 'Cancelled'];
  const activeOrders = orders.filter(o => !finalStatuses.includes(o.status)).length;

  // Completed orders
  const completedOrders = orders.filter(o => o.status === 'Completed').length;

  // Total spent (from completed orders)
  const totalSpent = orders
    .filter(o => o.status === 'Completed')
    .reduce((total, order) => total + (order.requested_amount || 0), 0);

  return {
    activeOrders,
    totalOrders: orders.length,
    completedOrders,
    totalSpent,
  };
}

export async function syncAuthUsersToProfiles(): Promise<{ success: boolean; message: string; synced: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated", synced: 0 };
    }

    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('admin')) {
      return { success: false, message: "Unauthorized: Admin access required", synced: 0 };
    }

    // Call the database function to sync auth users to profiles
    const { data, error } = await supabase.rpc('sync_auth_users_to_profiles');

    if (error) {
      console.error("Error syncing auth users to profiles:", error);
      return { success: false, message: error.message, synced: 0 };
    }

    return { success: true, message: "Users synced successfully", synced: data || 0 };
  } catch (error: any) {
    console.error("Error in syncAuthUsersToProfiles:", error);
    return { success: false, message: error.message || "An unexpected error occurred", synced: 0 };
  }
}

// Admin: Cancel all live orders (bulk cancellation)
export async function cancelAllLiveOrders(): Promise<{ success: boolean; cancelled: number; failed: number; errors: string[] }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, cancelled: 0, failed: 0, errors: ["Not authenticated"] };
    }

    // Verify user is admin
    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('admin')) {
      return { success: false, cancelled: 0, failed: 0, errors: ["Unauthorized: Admin access required"] };
    }

    // Get all live orders (not completed, not cancelled)
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .not('status', 'in', '(Completed,Cancelled)');

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      return { success: false, cancelled: 0, failed: 0, errors: [fetchError.message] };
    }

    if (!orders || orders.length === 0) {
      return { success: true, cancelled: 0, failed: 0, errors: [] };
    }

    let cancelled = 0;
    let failed = 0;
    const errors: string[] = [];

    // Cancel each order using FSM
    for (const order of orders) {
      try {
        const { error: fsmError } = await supabase.rpc('rpc_advance_order', {
          p_order_id: order.id,
          p_next_status: 'Cancelled',
          p_metadata: {
            reason: 'Bulk cancellation by admin',
            cancelled_by: user.id,
            bulk_cancellation: true
          }
        });

        if (fsmError) {
          failed++;
          errors.push(`${order.id.slice(0, 8)}: ${fsmError.message}`);
        } else {
          cancelled++;
        }
      } catch (error: any) {
        failed++;
        errors.push(`${order.id.slice(0, 8)}: ${error.message}`);
      }
    }

    return { success: true, cancelled, failed, errors };
  } catch (error: any) {
    console.error("Error in cancelAllLiveOrders:", error);
    return { success: false, cancelled: 0, failed: 0, errors: [error.message] };
  }
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

// ============================================================================
// Finite State Machine (FSM) Functions
// ============================================================================

/**
 * Advance order status using FSM with validation and audit trail
 * This is the ONLY way to change order status - prevents illegal transitions
 * 
 * @param orderId - Order ID to update
 * @param nextStatus - Target status
 * @param clientActionId - Idempotency key (optional but recommended)
 * @param metadata - Additional data to store in audit trail
 * @returns Updated order or null if failed
 */
export async function advanceOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  clientActionId?: string,
  metadata?: Record<string, any>
): Promise<Order | null> {
  try {
    // Generate idempotency key if not provided
    const actionId = clientActionId || crypto.randomUUID();
    
    const { data, error } = await supabase.rpc('rpc_advance_order', {
      p_order_id: orderId,
      p_next_status: nextStatus,
      p_client_action_id: actionId,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error advancing order status:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Failed to advance order status:', error);
    throw error;
  }
}

/**
 * Get complete audit trail for an order
 * Shows all status transitions with actor information
 * 
 * @param orderId - Order ID
 * @returns Array of order events with details
 */
export async function getOrderHistory(orderId: string): Promise<OrderEventWithDetails[]> {
  try {
    const { data, error } = await supabase.rpc('rpc_get_order_history', {
      p_order_id: orderId
    });

    if (error) {
      console.error('Error fetching order history:', error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch order history:', error);
    return [];
  }
}

/**
 * Check if a status transition is valid
 * Useful for UI to show/hide action buttons
 * 
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns True if transition is allowed
 */
export async function isValidTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_valid_transition', {
      p_from_status: fromStatus,
      p_to_status: toStatus
    });

    if (error) {
      console.error('Error checking transition validity:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to check transition validity:', error);
    return false;
  }
}

/**
 * Get all valid next statuses for current order status
 * Useful for showing available actions in UI
 * 
 * @param currentStatus - Current order status
 * @returns Array of valid next statuses
 */
export async function getValidNextStatuses(currentStatus: OrderStatus): Promise<OrderStatus[]> {
  try {
    const { data, error } = await supabase
      .from('order_status_transitions')
      .select('to_status')
      .eq('from_status', currentStatus);

    if (error) {
      console.error('Error fetching valid next statuses:', error);
      return [];
    }

    return Array.isArray(data) ? data.map(row => row.to_status) : [];
  } catch (error) {
    console.error('Failed to fetch valid next statuses:', error);
    return [];
  }
}

// ============================================================================
// Legacy function - DEPRECATED - Use advanceOrderStatus instead
// ============================================================================

/**
 * @deprecated Use advanceOrderStatus instead for FSM validation
 * This function bypasses FSM validation and should not be used
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  additionalData?: Partial<Order>
): Promise<boolean> {
  console.warn('⚠️ updateOrderStatus is deprecated. Use advanceOrderStatus instead for FSM validation.');
  
  // For backward compatibility, call the new FSM function
  try {
    const metadata = additionalData ? { legacy_data: additionalData } : {};
    const result = await advanceOrderStatus(orderId, status, undefined, metadata);
    return result !== null;
  } catch (error) {
    console.error('Error in legacy updateOrderStatus:', error);
    return false;
  }
}

// Real-time subscriptions
// Realtime Subscriptions
export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel("orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
      console.log("[Realtime] Orders change detected:", payload.eventType, payload.new || payload.old);
      callback(payload);
    })
    .subscribe((status) => {
      console.log("[Realtime] Orders subscription status:", status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("[Realtime] Orders subscription failed:", status);
      }
    });

  return channel;
}

export function subscribeToOrder(orderId: string, callback: (payload: any) => void) {
  const channel = supabase
    .channel(`order:${orderId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
      console.log(`[Realtime] Order ${orderId} change detected:`, payload.eventType, payload.new || payload.old);
      callback(payload);
    })
    .subscribe((status) => {
      console.log(`[Realtime] Order ${orderId} subscription status:`, status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`[Realtime] Order ${orderId} subscription failed:`, status);
      }
    });

  return channel;
}

// Order Issue Reporting
export type OrderIssueCategory =
  | 'CASH_AMOUNT'
  | 'LATE_ARRIVAL'
  | 'SAFETY_CONCERN'
  | 'UNPROFESSIONAL'
  | 'OTHER';

export async function createOrderIssue(params: {
  orderId: string;
  customerId: string;
  runnerId?: string | null;
  category: OrderIssueCategory;
  notes?: string;
}) {
  const { orderId, customerId, runnerId, category, notes } = params;

  // First, try to insert into order_issues table if it exists
  const { data, error } = await supabase
    .from('order_issues')
    .insert({
      order_id: orderId,
      customer_id: customerId,
      runner_id: runnerId ?? null,
      category,
      notes: notes?.trim() || null,
      status: 'OPEN',
    })
    .select()
    .single();

  // If order_issues table doesn't exist, fall back to order_events
  if (error && error.code === 'PGRST205') {
    console.warn('[createOrderIssue] order_issues table not found, falling back to order_events');
    
    // Get current user for actor_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get current order status for the event
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    // Store issue as an order_event with metadata
    const { data: eventData, error: eventError } = await supabase
      .from('order_events')
      .insert({
        order_id: orderId,
        from_status: order?.status || null,
        to_status: order?.status || 'Completed', // Keep same status
        actor_id: user.id,
        actor_role: 'customer',
        client_action_id: `issue_report_${orderId}_${Date.now()}`,
        metadata: {
          type: 'customer_issue_report',
          category,
          notes: notes?.trim() || null,
          runner_id: runnerId ?? null,
        },
      })
      .select()
      .single();

    if (eventError) {
      console.error('[createOrderIssue] error creating event', eventError);
      throw eventError;
    }

    return eventData;
  }

  if (error) {
    console.error('[createOrderIssue] error', error);
    throw error;
  }

  return data;
}

// Check if an order has a reported issue
// Cache table existence check to avoid repeated 404s
let orderIssuesTableExists: boolean | null = null;
let checkingTableExistence: Promise<boolean> | null = null;

async function checkTableExists(): Promise<boolean> {
  // If we already know, return immediately
  if (orderIssuesTableExists === false) return false;
  if (orderIssuesTableExists === true) return true;
  
  // If already checking, wait for that check
  if (checkingTableExistence) {
    return checkingTableExistence;
  }
  
  // Start a new check
  checkingTableExistence = (async () => {
    try {
      // Try a simple query to see if table exists
      const { error } = await supabase
        .from('order_issues')
        .select('id')
        .limit(0);
      
      // Check for 404 or PGRST205 (table not found)
      // Supabase returns 404 for missing tables, which may not have a specific error code
      const is404 = error && (
        error.code === 'PGRST205' || 
        error.message?.includes('404') || 
        error.message?.includes('relation') || 
        error.message?.includes('does not exist') ||
        error.message?.includes('not found') ||
        (error as any).status === 404 ||
        (error as any).statusCode === 404
      );
      
      if (is404) {
        orderIssuesTableExists = false;
        checkingTableExistence = null;
        return false;
      }
      
      // Table exists (no error or different error)
      orderIssuesTableExists = true;
      checkingTableExistence = null;
      return true;
    } catch (err) {
      // On any error, assume table doesn't exist to avoid repeated queries
      orderIssuesTableExists = false;
      checkingTableExistence = null;
      return false;
    }
  })();
  
  return checkingTableExistence;
}

export async function hasOrderIssue(orderId: string): Promise<boolean> {
  try {
    // First check if table exists (with caching)
    const tableExists = await checkTableExists();
    
    // Only query order_issues if table exists
    if (tableExists) {
      const { data: issueData, error: issueError } = await supabase
        .from('order_issues')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      // If we found an issue, return true
      if (issueData && !issueError) {
        return true;
      }

      // If no issue found and no error, return false
      if (!issueData && !issueError) {
        return false;
      }

      // If there's an error, log it but continue to fallback
      if (issueError) {
        console.warn('[hasOrderIssue] Error checking order_issues:', issueError);
      }
    }

    // Fall back to checking order_events for customer_issue_report
    // Check by metadata type first (more reliable)
    const { data: metadataData, error: metadataError } = await supabase
      .from('order_events')
      .select('id')
      .eq('order_id', orderId)
      .eq('metadata->>type', 'customer_issue_report')
      .limit(1);

    if (!metadataError && metadataData && metadataData.length > 0) {
      return true;
    }

    // Fallback to checking client_action_id pattern if metadata check failed
    if (metadataError) {
      console.warn('[hasOrderIssue] Error checking metadata, trying client_action_id:', metadataError);
    }

    const { data: actionData, error: actionError } = await supabase
      .from('order_events')
      .select('id')
      .eq('order_id', orderId)
      .like('client_action_id', `issue_report_${orderId}_%`)
      .limit(1);

    if (actionError) {
      console.error('[hasOrderIssue] Error checking client_action_id:', actionError);
      return false;
    }

    return (actionData && actionData.length > 0) || false;
  } catch (error) {
    console.error('[hasOrderIssue] Unexpected error:', error);
    return false;
  }
}

// Admin: Create a test/mock order for runner training
export async function createTestOrder(): Promise<{ success: boolean; orderId?: string; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    // Verify user is admin
    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('admin')) {
      return { success: false, message: "Unauthorized: Admin access required" };
    }

    // Calculate fees for $100 test order
    const fees = calculateFees(100);

    // Create a test order with mock data
    const testOrderData = {
      customer_id: user.id, // Use admin as customer for test
      requested_amount: fees.requestedAmount,
      profit: fees.profit,
      compliance_fee: fees.complianceFee,
      delivery_fee: fees.deliveryFee,
      total_service_fee: fees.totalServiceFee,
      total_payment: fees.totalPayment,
      customer_address: "ABC Bank ATM, 123 XYZ Street",
      customer_name: "Test Customer",
      customer_notes: "🎓 TRAINING ORDER: This is a test order. Use this to familiarize yourself with the acceptance and completion process. Delivery location: Central Office, 456 Main Avenue.",
      status: "Pending" as const
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(testOrderData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error creating test order:", error);
      return { success: false, message: "Failed to create test order" };
    }

    if (!data) {
      return { success: false, message: "No data returned after creating test order" };
    }

    // Create audit log entry
    await createAuditLog(
      "CREATE_TEST_ORDER",
      "order",
      data.id,
      {},
      testOrderData
    );

    return { 
      success: true, 
      orderId: data.id,
      message: "Test order created successfully" 
    };
  } catch (error) {
    console.error("Error in createTestOrder:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}

// Customer: Rate a completed delivery
export async function updateOrderRating(
  orderId: string,
  rating: number,
  comment: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    // Verify order belongs to customer and is completed
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, customer_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
      return { success: false, message: "Failed to fetch order" };
    }

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (order.customer_id !== user.id) {
      return { success: false, message: "Unauthorized: This order does not belong to you" };
    }

    if (order.status !== 'Completed') {
      return { success: false, message: "You can only rate completed orders" };
    }

    // Try to update rating (assuming rating columns exist)
    // If they don't exist, this will fail gracefully and we'll use metadata approach
    const updateData: any = {
      rating: rating,
      rating_comment: comment,
      rating_submitted_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      // If rating columns don't exist, fall back to storing in metadata via audit log
      console.warn("Rating columns may not exist, using metadata fallback:", updateError);
      
      // Store rating in audit log as fallback
      await createAuditLog(
        "RATE_ORDER",
        "order",
        orderId,
        {},
        {
          rating: rating,
          comment: comment,
          rated_at: new Date().toISOString()
        }
      );

      // Return success even if direct update failed (rating stored in audit log)
      return { success: true, message: "Rating submitted successfully (stored in audit log)" };
    }

    return { success: true, message: "Rating submitted successfully" };
  } catch (error: any) {
    console.error("Error in updateOrderRating:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
}

/**
 * Rate a runner (customer → runner rating)
 * Only works for completed orders and only if rating is not already set
 */
export async function rateRunner(orderId: string, rating: number): Promise<void> {
  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating. Rating must be between 1 and 5.");
  }

  // Fetch order with all fields to avoid column-specific issues
  const { data: order, error: checkError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking order for rating:", checkError);
    // Log full error in dev for debugging
    if (import.meta.env.DEV) {
      console.error('[Rating rateRunner] Full error details:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError,
        hint: checkError.hint
      });
    }
    // Provide more specific error message
    if (checkError.code === 'PGRST116') {
      throw new Error("Order not found.");
    }
    if (checkError.code === '42501' || checkError.message?.includes('permission') || checkError.message?.includes('policy')) {
      throw new Error("Permission denied. Please ensure you have access to this order.");
    }
    if (checkError.code === '42703' || checkError.message?.includes('column') || checkError.message?.includes('does not exist')) {
      throw new Error("Rating feature is not available. Please run migrations: 20250113_add_ratings_to_orders.sql and 20250114_allow_runner_customer_ratings.sql");
    }
    throw new Error(`Failed to verify order: ${checkError.message || 'Unknown error'}`);
  }

  if (!order) {
    throw new Error("Order not found.");
  }

  // Check status (case-sensitive: "Completed" not "completed")
  if (order.status !== "Completed") {
    throw new Error("You can only rate runners for completed deliveries.");
  }

  // Check if already rated (handle case where column might not exist)
  const existingRating = (order as any).runner_rating;
  if (existingRating !== null && existingRating !== undefined) {
    throw new Error("You have already rated this runner.");
  }

  // Verify customer owns this order
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Check if customer owns this order
  if ((order as any).customer_id !== user.id) {
    throw new Error("You can only rate runners for your own orders.");
  }

  // Update rating
  const { error } = await supabase
    .from("orders")
    .update({ runner_rating: rating })
    .eq("id", orderId)
    .eq("customer_id", user.id) // Extra security check
    .eq("status", "Completed"); // Extra security check

  if (error) {
    console.error("Error rating runner:", error);
    // Check if column doesn't exist
    if (error.code === '42703' || error.message?.includes('runner_rating') || error.message?.includes('column')) {
      if (import.meta.env.DEV) {
        console.error('[Rating] runner_rating column may not exist. Run migration: 20250113_add_ratings_to_orders.sql');
      }
      throw new Error("Rating feature is not available. Please contact support.");
    }
    // Check for permission errors
    if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
      if (import.meta.env.DEV) {
        console.error('[Rating] Permission denied. RLS policy may be blocking update. Run migration: 20250114_allow_runner_customer_ratings.sql');
      }
      throw new Error("Permission denied. Please contact support.");
    }
    throw error;
  }
}

/**
 * Rate a customer (runner → customer rating)
 * Only works for completed orders and only if rating is not already set
 */
export async function rateCustomerByRunner(orderId: string, rating: number): Promise<void> {
  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating. Rating must be between 1 and 5.");
  }

  // Fetch order with all fields to avoid column-specific issues
  const { data: order, error: checkError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking order for rating:", checkError);
    // Log full error in dev for debugging
    if (import.meta.env.DEV) {
      console.error('[Rating rateCustomerByRunner] Full error details:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError,
        hint: checkError.hint
      });
    }
    // Provide more specific error message
    if (checkError.code === 'PGRST116') {
      throw new Error("Order not found.");
    }
    if (checkError.code === '42501' || checkError.message?.includes('permission') || checkError.message?.includes('policy')) {
      throw new Error("Permission denied. Please ensure you have access to this order. Run migration: 20250114_allow_runner_customer_ratings.sql");
    }
    if (checkError.code === '42703' || checkError.message?.includes('column') || checkError.message?.includes('does not exist')) {
      throw new Error("Rating feature is not available. Please run migrations: 20250113_add_ratings_to_orders.sql and 20250114_allow_runner_customer_ratings.sql");
    }
    throw new Error(`Failed to verify order: ${checkError.message || 'Unknown error'}`);
  }

  if (!order) {
    throw new Error("Order not found.");
  }

  // Check status (case-sensitive: "Completed" not "completed")
  if (order.status !== "Completed") {
    throw new Error("You can only rate customers for completed deliveries.");
  }

  // Check if already rated (handle case where column might not exist)
  const existingRating = (order as any).customer_rating_by_runner;
  if (existingRating !== null && existingRating !== undefined) {
    throw new Error("You have already rated this customer.");
  }

  // Verify runner is assigned to this order
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Check if runner is assigned to this order
  if ((order as any).runner_id !== user.id) {
    throw new Error("You can only rate customers for orders you've completed.");
  }

  // Update rating
  const { error } = await supabase
    .from("orders")
    .update({ customer_rating_by_runner: rating })
    .eq("id", orderId)
    .eq("runner_id", user.id) // Extra security check
    .eq("status", "Completed"); // Extra security check

  if (error) {
    console.error("Error rating customer:", error);
    // Check if column doesn't exist
    if (error.code === '42703' || error.message?.includes('customer_rating_by_runner') || error.message?.includes('column')) {
      if (import.meta.env.DEV) {
        console.error('[Rating] customer_rating_by_runner column may not exist. Run migration: 20250113_add_ratings_to_orders.sql');
      }
      throw new Error("Rating feature is not available. Please contact support.");
    }
    // Check for permission errors
    if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
      if (import.meta.env.DEV) {
        console.error('[Rating] Permission denied. RLS policy may be blocking update. Run migration: 20250114_allow_runner_customer_ratings.sql');
      }
      throw new Error("Permission denied. Please contact support.");
    }
    throw error;
  }
}

/**
 * Skip a runner offer
 * Logs the skip event for analytics
 */
export async function skipRunnerOffer(
  offerId: string,
  reason: "manual" | "timeout"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is a runner
    const profile = await getCurrentProfile();
    if (!profile || !profile.role.includes('runner')) {
      return { success: false, error: "Unauthorized: Only runners can skip offers" };
    }

    // Log the skip or timeout event (this creates a record that the runner skipped/missed this order)
    // Use 'timeout' event when the timer expired, 'skipped' when manually skipped
    await logRunnerOfferEvent({
      offerId,
      event: reason === 'timeout' ? 'timeout' : 'skipped',
      reason,
    });

    // Mark the order as skipped by this runner in runner_offer_events
    // This ensures the order won't be shown to this runner again
    // The order remains available for other runners until accepted or cancelled

    return { success: true };
  } catch (error: any) {
    console.error("Error skipping offer:", error);
    return {
      success: false,
      error: error?.message || "Failed to skip offer"
    };
  }
}

/**
 * Log runner offer events for analytics
 */
export async function logRunnerOfferEvent(data: {
  offerId: string;
  event: 'received' | 'accepted' | 'skipped' | 'timeout';
  reason?: string;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Try to insert into runner_offer_events table
    // If table doesn't exist, just log to console (graceful degradation)
    const { error } = await supabase
      .from('runner_offer_events')
      .insert({
        runner_id: user.id,
        offer_id: data.offerId,
        event: data.event,
        reason: data.reason || null,
      });

    if (error) {
      // If table doesn't exist, just log to console
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('[RunnerOfferEvent] Table not found, logging to console:', data);
      } else {
        console.error('Error logging runner offer event:', error);
      }
    }
  } catch (error) {
    // Graceful degradation - don't break the app if logging fails
    console.error('Error logging runner offer event:', error);
  }
}

// Bank Account APIs
export interface BankAccount {
  id: string;
  user_id: string;
  plaid_item_id: string;
  bank_institution_name: string | null;
  bank_institution_logo_url: string | null;
  bank_last4: string | null;
  is_primary: boolean;
  kyc_status: string;
  kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[getBankAccounts] No user found");
    return [];
  }

  console.log("[getBankAccounts] Fetching bank accounts for user:", user.id);
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    // If table doesn't exist, fall back to profile data
    if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('relation "bank_accounts"') || error.message?.includes('schema cache')) {
      console.log("[getBankAccounts] bank_accounts table not found, checking profile for legacy bank data");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("plaid_item_id, bank_institution_name, bank_institution_logo_url, kyc_status, kyc_verified_at")
        .eq("id", user.id)
        .single();
      
      if (profileError) {
        console.error("[getBankAccounts] Error fetching profile:", profileError);
        return [];
      }
      
      if (profile && profile.plaid_item_id) {
        // Return legacy format
        console.log("[getBankAccounts] Found legacy bank account in profile:", {
          plaid_item_id: profile.plaid_item_id,
          institution_name: profile.bank_institution_name,
          has_logo: !!profile.bank_institution_logo_url,
        });
        return [{
          id: 'legacy',
          user_id: user.id,
          plaid_item_id: profile.plaid_item_id,
          bank_institution_name: profile.bank_institution_name,
          bank_institution_logo_url: profile.bank_institution_logo_url,
          bank_last4: null,
          is_primary: true,
          kyc_status: profile.kyc_status || 'verified',
          kyc_verified_at: profile.kyc_verified_at,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
      console.log("[getBankAccounts] No bank account found in profile");
      return [];
    }
    console.error("Error fetching bank accounts:", error);
    return [];
  }

  const result = Array.isArray(data) ? data : [];
  console.log("[getBankAccounts] Query result from bank_accounts table:", result.length);
  
  // If table exists but is empty, check profile for legacy bank data
  if (result.length === 0) {
    console.log("[getBankAccounts] Table is empty, checking profile for legacy bank data");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plaid_item_id, bank_institution_name, bank_institution_logo_url, kyc_status, kyc_verified_at")
      .eq("id", user.id)
      .single();
    
    if (profileError) {
      console.error("[getBankAccounts] Error fetching profile:", profileError);
      return [];
    }
    
    if (profile && profile.plaid_item_id) {
      // Return legacy format
      console.log("[getBankAccounts] Found legacy bank account in profile:", {
        plaid_item_id: profile.plaid_item_id,
        institution_name: profile.bank_institution_name,
        has_logo: !!profile.bank_institution_logo_url,
      });
      return [{
        id: 'legacy',
        user_id: user.id,
        plaid_item_id: profile.plaid_item_id,
        bank_institution_name: profile.bank_institution_name,
        bank_institution_logo_url: profile.bank_institution_logo_url,
        bank_last4: null,
        is_primary: true,
        kyc_status: profile.kyc_status || 'verified',
        kyc_verified_at: profile.kyc_verified_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
    }
    console.log("[getBankAccounts] No bank account found in profile either");
    return [];
  }
  
  console.log("[getBankAccounts] Returning bank accounts from table:", result.length);
  return result;
}

export async function deleteBankAccount(bankAccountId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Handle legacy bank account (stored in profiles table)
  if (bankAccountId === 'legacy') {
    console.log("[deleteBankAccount] Deleting legacy bank account from profiles table");
    const { error } = await supabase
      .from("profiles")
      .update({
        plaid_item_id: null,
        kyc_status: 'unverified',
        kyc_verified_at: null,
        bank_institution_name: null,
        bank_institution_logo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);
    
    if (error) {
      console.error("Error deleting legacy bank account:", error);
      return false;
    }
    return true;
  }

  // Try to delete from bank_accounts table
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", bankAccountId)
    .eq("user_id", user.id); // Ensure user can only delete their own accounts

  if (error) {
    // If table doesn't exist, fall back to profiles table
    if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('relation "bank_accounts"')) {
      console.log("[deleteBankAccount] bank_accounts table not found, deleting from profiles table");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          plaid_item_id: null,
          kyc_status: 'unverified',
          kyc_verified_at: null,
          bank_institution_name: null,
          bank_institution_logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
      
      if (profileError) {
        console.error("Error deleting bank account from profiles:", profileError);
        return false;
      }
      return true;
    }
    console.error("Error deleting bank account:", error);
    return false;
  }

  return true;
}

