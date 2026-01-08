// Supabase Edge Function: Notify Order Event
// Sends push notifications when order events occur

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Safe JSON parsing (avoids "Unexpected end of JSON input" on empty body)
async function safeJson(req: Request): Promise<any> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("INVALID_JSON_BODY");
  }
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// Initialize Supabase client with service role (for RLS bypass)
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL must be set");
  }
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// CORS headers helper
function getCorsHeaders(req?: Request): Record<string, string> {
  const requested = req?.headers.get("Access-Control-Request-Headers");
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": requested ?? "authorization, content-type, apikey, x-client-info, x-requested-with",
    "Access-Control-Max-Age": "86400",
  };
}

// Notification templates (Benjamin tone: clear, friendly, action-oriented)
const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: (payload: any) => string }> = {
  order_created: {
    title: "Order placed",
    body: () => "Your cash delivery request is being processed. We'll match you with a runner soon."
  },
  runner_assigned: {
    title: "Runner assigned",
    body: (p) => `Your runner is on the way! ${p.runner_name ? `Meet ${p.runner_name}` : "They'll arrive soon"}.`
  },
  runner_en_route: {
    title: "Runner on the way",
    body: (p) => p.eta_seconds 
      ? `Your runner will arrive in ${Math.round(p.eta_seconds / 60)} minutes.`
      : "Your runner is heading to your location."
  },
  runner_arrived: {
    title: "Runner arrived",
    body: () => "Your runner has arrived at your location. Please verify the OTP to complete the handoff."
  },
  otp_verified: {
    title: "OTP verified",
    body: () => "Handoff in progress. Your runner will complete the delivery shortly."
  },
  handoff_completed: {
    title: "Delivery completed",
    body: () => "Your cash delivery is complete! Thank you for using Benjamin."
  },
  order_cancelled: {
    title: "Order cancelled",
    body: (p) => p.cancelled_by === "customer" 
      ? "Your order has been cancelled. Refund processing initiated."
      : "Your order has been cancelled. Refund processing initiated."
  },
  refund_processing: {
    title: "Refund processing",
    body: () => "Your refund is being processed. Funds will be returned to your bank account."
  },
  refund_succeeded: {
    title: "Refund completed",
    body: () => "Your refund has been processed. Funds have been returned to your bank account."
  },
  refund_failed: {
    title: "Refund issue",
    body: (p) => `There was an issue processing your refund. ${p.error ? `Error: ${p.error}` : "Please contact support."}`
  }
};

// Get notification content for an event
function getNotificationContent(eventType: string, payload: any): { title: string; body: string } | null {
  const template = NOTIFICATION_TEMPLATES[eventType];
  if (!template) {
    console.warn(`[Notify] No template for event_type: ${eventType}`);
    return null;
  }
  
  return {
    title: template.title,
    body: template.body(payload || {})
  };
}

// Send push notification via FCM/APNs (stub - to be implemented)
async function sendPushNotification(params: {
  token: string;
  platform: 'ios' | 'android' | 'web';
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement FCM for Android and APNs for iOS
  // For now, log and return success (mock mode)
  console.log("[Notify] Would send push:", {
    platform: params.platform,
    tokenPreview: params.token.substring(0, 20) + "...",
    title: params.title,
    body: params.body,
    data: params.data
  });
  
  // Stub: return success
  return { success: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
  }

  try {
    const supabase = getSupabaseClient();

    // Verify caller identity (Verify JWT should be ON). We enforce order ownership.
    const jwt = getBearerToken(req);
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization bearer token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }

    // Use anon key from env (preferred) or fall back to incoming apikey header
    const supabaseAnonKey = (Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "").toString();
    if (!supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_ANON_KEY must be set (or provide apikey header)" }),
        { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }

    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL") || "", supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userErr?.message }),
        { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }

    const callerUserId = userData.user.id;

    // Parse request body (safe)
    let body: any;
    try {
      body = await safeJson(req);
    } catch (e: any) {
      const msg = e?.message === "INVALID_JSON_BODY" ? "Invalid JSON body" : "Failed to parse body";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }

    const { order_id, event_type, payload, order_event_id } = body;
    
    // Get event data (either from order_event_id or from params)
    let event;
    if (order_event_id) {
      // Load event from database
      const { data: eventData, error: eventError } = await supabase
        .from("order_events")
        .select("id, order_id, event_type, payload")
        .eq("id", order_event_id)
        .single();
      
      if (eventError || !eventData) {
        return new Response(
          JSON.stringify({ error: "Order event not found", details: eventError?.message }),
          { status: 404, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
        );
      }
      
      event = eventData;
    } else if (order_id && event_type) {
      // Use provided params
      event = { order_id, event_type, payload: payload || {} };
    } else {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id + event_type OR order_event_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Load order to get customer_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, status")
      .eq("id", event.order_id)
      .single();
    
    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Ownership guard: callers may only notify events for their own orders
    if (order.customer_id !== callerUserId) {
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "You do not have access to this order" }),
        { status: 403, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Get notification content
    const notification = getNotificationContent(event.event_type, event.payload);
    if (!notification) {
      // No template for this event type - skip notification
      return new Response(
        JSON.stringify({ message: "No notification template for this event type", event_type: event.event_type }),
        { status: 200, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Load active push tokens for customer
    const { data: devices, error: devicesError } = await supabase
      .from("user_push_tokens")
      .select("token, platform, app_role")
      .eq("user_id", order.customer_id)
      .eq("is_active", true);
    
    if (devicesError) {
      console.error("[Notify] Error loading devices:", devicesError);
      return new Response(
        JSON.stringify({ error: "Failed to load devices", details: devicesError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    if (!devices || devices.length === 0) {
      console.log("[Notify] No active devices for customer:", order.customer_id);
      return new Response(
        JSON.stringify({ message: "No active devices found", customer_id: order.customer_id }),
        { status: 200, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Send notifications to all active devices
    const results = [];
    for (const device of devices) {
      // Only send to customer app (not runner/admin)
      if (device.app_role !== 'customer') {
        continue;
      }
      
      const result = await sendPushNotification({
        token: device.token,
        platform: device.platform as 'ios' | 'android' | 'web',
        title: notification.title,
        body: notification.body,
        data: {
          order_id: order.id,
          event_type: event.event_type,
          ...event.payload
        }
      });
      
      results.push({
        device_id: device.token.substring(0, 20) + "...",
        platform: device.platform,
        success: result.success,
        error: result.error
      });
    }
    
    console.log("[Notify] ✅ Notifications sent:", {
      order_id: order.id,
      event_type: event.event_type,
      devices_count: devices.length,
      results
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        event_type: event.event_type,
        devices_notified: results.length,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
    
  } catch (error: any) {
    console.error("[Notify] ❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
  }
});
