// Supabase Edge Function: Notify Message Event
// Sends push notifications when new messages are created in order chat

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

function getWebhookSecret(req: Request): string | null {
  return req.headers.get("x-webhook-secret") || req.headers.get("X-Webhook-Secret");
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
  
  // iOS and Web are not yet implemented
  // For now, log and return success (mock mode)
  console.log("[Notify] Would send push (not Android):", {
    platform: params.platform,
    tokenPreview: params.token.substring(0, 20) + "...",
    title: params.title,
    body: params.body,
    data: params.data
  });
  
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

    // Check for webhook secret (database trigger calls)
    const webhookSecret = getWebhookSecret(req);
    const expectedWebhookSecret = Deno.env.get("WEBHOOK_SECRET") || "";
    const isWebhookCall = webhookSecret && expectedWebhookSecret && webhookSecret === expectedWebhookSecret;

    let callerUserId: string | null = null;

    if (!isWebhookCall) {
      // In-app call: require JWT authentication
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

      callerUserId = userData.user.id;
    } else {
      // Webhook call: authenticated via secret, no user context needed
      console.log("[Notify] Webhook call authenticated via secret");
    }

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

    const { message_id } = body;
    
    if (!message_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: message_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Load message from database
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, order_id, sender_id, sender_role, body, created_at")
      .eq("id", message_id)
      .single();
    
    if (messageError || !message) {
      return new Response(
        JSON.stringify({ error: "Message not found", details: messageError?.message }),
        { status: 404, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Load order to get customer_id and runner_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, runner_id, status")
      .eq("id", message.order_id)
      .single();
    
    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Determine recipient: if sender is customer, notify runner; if sender is runner, notify customer
    // Admin messages notify both customer and runner
    let recipientIds: string[] = [];
    
    if (message.sender_role === 'customer') {
      // Customer sent message - notify runner
      if (order.runner_id) {
        recipientIds = [order.runner_id];
      }
    } else if (message.sender_role === 'runner') {
      // Runner sent message - notify customer
      recipientIds = [order.customer_id];
    } else if (message.sender_role === 'admin') {
      // Admin sent message - notify both customer and runner
      recipientIds = [order.customer_id];
      if (order.runner_id) {
        recipientIds.push(order.runner_id);
      }
    }
    
    // Don't notify the sender
    recipientIds = recipientIds.filter(id => id !== message.sender_id);
    
    if (recipientIds.length === 0) {
      console.log("[Notify] No recipients for message:", message_id);
      return new Response(
        JSON.stringify({ message: "No recipients found", message_id }),
        { status: 200, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
      );
    }
    
    // Get sender name for notification
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", message.sender_id)
      .single();
    
    const senderName = senderProfile 
      ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || 'Someone'
      : 'Someone';
    
    // Build notification content
    const notificationTitle = "New message";
    const notificationBody = message.body.length > 100 
      ? `${message.body.substring(0, 100)}...`
      : message.body;
    
    // Send notifications to all recipients
    const results: Array<{ user_id: string; platform: string; success: boolean; error?: string }> = [];
    
    for (const recipientId of recipientIds) {
      // Load active push tokens for recipient
      const { data: devices, error: devicesError } = await supabase
        .from("user_push_tokens")
        .select("token, platform, app_role")
        .eq("user_id", recipientId)
        .eq("is_active", true);
      
      if (devicesError) {
        console.error("[Notify] Error loading devices for user:", recipientId, devicesError);
        continue;
      }
      
      if (!devices || devices.length === 0) {
        console.log("[Notify] No active devices for user:", recipientId);
        continue;
      }
      
      // Send to all active devices for this recipient
      for (const device of devices) {
        const result = await sendPushNotification({
          token: device.token,
          platform: device.platform as 'ios' | 'android' | 'web',
          title: notificationTitle,
          body: `${senderName}: ${notificationBody}`,
          data: {
            message_id: message.id,
            order_id: order.id,
            sender_id: message.sender_id,
            sender_role: message.sender_role
          }
        });
        
        results.push({
          user_id: recipientId,
          platform: device.platform,
          success: result.success,
          error: result.error
        });
      }
    }
    
    console.log("[Notify] ✅ Message notifications sent:", {
      message_id: message.id,
      order_id: order.id,
      sender_role: message.sender_role,
      recipients_count: recipientIds.length,
      results
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message_id: message.id,
        order_id: order.id,
        recipients_notified: results.length,
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

