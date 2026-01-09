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

// ============================================================================
// FCM (Firebase Cloud Messaging) Helpers for Android Push Notifications
// ============================================================================

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Base64 URL encode helper
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Convert PEM private key to CryptoKey for signing
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Decode base64
  const binaryString = atob(keyData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Import as PKCS#8 private key
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

// Create and sign JWT for OAuth token exchange
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const claim = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600, // 1 hour expiration
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };
  
  // Encode header and claim
  const headerB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const claimB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claim))
  );
  
  const unsignedJWT = `${headerB64}.${claimB64}`;
  
  // Sign with private key
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedJWT)
  );
  
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${unsignedJWT}.${signatureB64}`;
}

// Get FCM OAuth access token
async function getFcmAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON environment variable is not set");
  }
  
  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error(`Failed to parse FCM_SERVICE_ACCOUNT_JSON: ${e.message}`);
  }
  
  // Create and sign JWT
  const jwt = await createJWT(serviceAccount);
  
  // Exchange JWT for OAuth access token
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get FCM access token: ${tokenResponse.status} ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('FCM access token response missing access_token');
  }
  
  return tokenData.access_token;
}

// Send Android push notification via FCM HTTP v1 API
async function sendAndroidPush(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const projectId = Deno.env.get("FCM_PROJECT_ID");
  if (!projectId) {
    throw new Error("FCM_PROJECT_ID environment variable is not set");
  }
  
  try {
    // Get OAuth access token
    const accessToken = await getFcmAccessToken();
    
    // Build FCM message payload
    const message: any = {
      token: params.token,
      notification: {
        title: params.title,
        body: params.body,
      },
    };
    
    // Add data payload if provided (convert all values to strings as FCM requires)
    if (params.data && Object.keys(params.data).length > 0) {
      message.data = {};
      for (const [key, value] of Object.entries(params.data)) {
        message.data[key] = String(value);
      }
    }
    
    // Send via FCM HTTP v1 API
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FCM] Send failed: ${response.status} ${errorText}`);
      return {
        success: false,
        error: `FCM API error: ${response.status} ${errorText}`,
      };
    }
    
    const result = await response.json();
    console.log(`[FCM] ✅ Push sent successfully:`, {
      tokenPreview: params.token.substring(0, 20) + "...",
      messageId: result.name,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error(`[FCM] ❌ Error sending push:`, error);
    return {
      success: false,
      error: error.message || 'Unknown FCM error',
    };
  }
}

// ============================================================================
// APNs (Apple Push Notification service) Helpers for iOS Push Notifications
// ============================================================================

// Create and sign JWT for APNs authentication
async function createAPNsJWT(keyId: string, teamId: string, keyContent: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: keyId,
  };
  
  const claim = {
    iss: teamId,
    iat: now,
    exp: now + 3600, // 1 hour expiration
  };
  
  // Encode header and claim
  const headerB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const claimB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claim))
  );
  
  const unsignedJWT = `${headerB64}.${claimB64}`;
  
  // Import EC private key (APNs uses ES256/ECDSA, not RSA)
  // APNs .p8 key is in PKCS#8 format
  const keyData = keyContent
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  const binaryString = atob(keyData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Import as EC private key (P-256 curve for ES256)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );
  
  // Sign with ES256 (ECDSA with SHA-256)
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    new TextEncoder().encode(unsignedJWT)
  );
  
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${unsignedJWT}.${signatureB64}`;
}

// Send iOS push notification via APNs HTTP/2 API
async function sendIOSPush(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  const keyContent = Deno.env.get("APNS_KEY_CONTENT");
  const environment = Deno.env.get("APNS_ENVIRONMENT") || "production";
  
  if (!keyId || !teamId || !bundleId || !keyContent) {
    return {
      success: false,
      error: "APNs configuration missing. Required: APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_KEY_CONTENT",
    };
  }
  
  try {
    // Create APNs JWT
    const jwt = await createAPNsJWT(keyId, teamId, keyContent);
    
    // Determine APNs endpoint
    const apnsUrl = environment === "development"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";
    
    // Build APNs payload
    const payload: any = {
      aps: {
        alert: {
          title: params.title,
          body: params.body,
        },
        sound: "default",
      },
    };
    
    // Add custom data payload (APNs allows arbitrary keys at root level)
    if (params.data && Object.keys(params.data).length > 0) {
      for (const [key, value] of Object.entries(params.data)) {
        payload[key] = String(value);
      }
    }
    
    // Send via APNs HTTP/2 API
    const response = await fetch(`${apnsUrl}/3/device/${params.token}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[APNs] Send failed: ${response.status} ${errorText}`);
      return {
        success: false,
        error: `APNs API error: ${response.status} ${errorText}`,
      };
    }
    
    const apnsId = response.headers.get("apns-id");
    console.log(`[APNs] ✅ Push sent successfully:`, {
      provider: "APNs",
      platform: "ios",
      tokenPreview: params.token.substring(0, 20) + "...",
      apnsId: apnsId || "unknown",
      environment,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error(`[APNs] ❌ Error sending push:`, error);
    return {
      success: false,
      error: error.message || 'Unknown APNs error',
    };
  }
}

// Send push notification via FCM (Android) or APNs (iOS)
async function sendPushNotification(params: {
  token: string;
  platform: 'ios' | 'android' | 'web';
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  // Handle Android devices via FCM
  if (params.platform === 'android') {
    try {
      return await sendAndroidPush({
        token: params.token,
        title: params.title,
        body: params.body,
        data: params.data,
      });
    } catch (error: any) {
      // Log error but don't break the function
      console.error(`[Notify] Android push error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to send Android push',
      };
    }
  }
  
  // Handle iOS devices via APNs
  if (params.platform === 'ios') {
    try {
      return await sendIOSPush({
        token: params.token,
        title: params.title,
        body: params.body,
        data: params.data,
      });
    } catch (error: any) {
      // Log error but don't break the function
      console.error(`[Notify] iOS push error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to send iOS push',
      };
    }
  }
  
  // Web platform - not supported
  console.log("[Notify] Web platform push not supported:", {
    platform: params.platform,
    tokenPreview: params.token.substring(0, 20) + "...",
  });
  
  return { success: false, error: "Web platform push notifications not supported" };
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

    const { order_id, event_type, payload, order_event_id, token, title, body: bodyText } = body;
    
    // ============================================================================
    // TEST SEND PATH: Direct push notification test
    // Accepts: { "token": "...", "title": "Test", "body": "Hello" }
    // ============================================================================
    if (token && title && bodyText && !order_id && !order_event_id) {
      console.log("[Notify] 🧪 Test send requested:", {
        tokenPreview: token.substring(0, 20) + "...",
        title,
        body: bodyText
      });
      
      // For test sends, default to android (FCM) - can be extended to detect platform
      const platform = 'android' as 'ios' | 'android' | 'web';
      
      const result = await sendPushNotification({
        token,
        platform,
        title,
        body: bodyText,
        data: { test: 'true' }
      });
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: "Test notification sent",
          tokenPreview: token.substring(0, 20) + "...",
          platform,
          error: result.error
        }),
        {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    // ============================================================================
    // NORMAL PATH: Order event notifications
    // ============================================================================
    
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
    const results: Array<{ device_id: string; platform: string; success: boolean; error?: string }> = [];
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
