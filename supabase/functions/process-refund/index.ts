// Supabase Edge Function: Process Refund
// Handles refund routing and execution when orders are cancelled

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with service role (for RLS bypass)
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
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
  // Echo requested headers if present (important for browser preflight)
  const requested = req?.headers.get("Access-Control-Request-Headers");

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": requested ?? "authorization, content-type, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}

// Safe JSON parser - handles empty bodies and invalid JSON gracefully
async function safeJson(req: Request): Promise<Record<string, any>> {
  try {
    // Check if body is null (already consumed or doesn't exist)
    if (!req.body) {
      console.log("[Refund] Request body is null, returning empty object");
      return {};
    }
    
    // Read body as text first (safer than direct JSON parse)
    const text = await req.text();
    
    if (!text || text.trim() === '') {
      console.log("[Refund] Empty request body text, returning empty object");
      return {};
    }
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      console.log("[Refund] Successfully parsed JSON body");
      return parsed;
    } catch (parseError: any) {
      // JSON parse failed - log but don't throw
      console.error("[Refund] Invalid JSON in request body:", {
        error: parseError.message,
        textLength: text.length,
        textPreview: text.substring(0, 100)
      });
      return {};
    }
  } catch (error: any) {
    // Catch any errors from req.text() itself (body already consumed, network error, etc.)
    console.error("[Refund] Error reading request body:", {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack
    });
    // Return empty object instead of throwing
    return {};
  }
}

// Refund routing logic: pinned bank → fallback to primary
async function determineRefundDestination(
  supabase: ReturnType<typeof getSupabaseClient>,
  order: { customer_id: string; bank_account_id: string | null }
): Promise<{ bankAccountId: string; fallbackReason: string | null }> {
  const pinnedId = order.bank_account_id;
  
  // Try pinned bank first
  if (pinnedId) {
    const { data: pinnedBank, error } = await supabase
      .from("bank_accounts")
      .select("id, plaid_item_id, user_id")
      .eq("id", pinnedId)
      .eq("user_id", order.customer_id)
      .single();
    
    // Use pinned if it exists and has plaid_item_id (can process refund)
    if (!error && pinnedBank && pinnedBank.plaid_item_id) {
      console.log("[Refund] Using pinned bank account:", {
        bankAccountId: pinnedBank.id,
        plaidItemId: pinnedBank.plaid_item_id
      });
      return { bankAccountId: pinnedBank.id, fallbackReason: null };
    }
    
    console.log("[Refund] Pinned bank unavailable, falling back to primary:", {
      pinnedId,
      error: error?.message,
      hasPlaidItem: pinnedBank?.plaid_item_id ? true : false
    });
  }
  
  // Fallback: Get primary bank account
  const { data: primaryBank, error: primaryError } = await supabase
    .from("bank_accounts")
    .select("id, plaid_item_id, user_id")
    .eq("user_id", order.customer_id)
    .eq("is_primary", true)
    .single();
  
  if (primaryError || !primaryBank || !primaryBank.plaid_item_id) {
    throw new Error(
      `NO_REFUND_DESTINATION: Cannot find primary bank account for customer ${order.customer_id}. ` +
      `Pinned bank unavailable and no primary bank found.`
    );
  }
  
  console.log("[Refund] Using primary bank account (fallback):", {
    bankAccountId: primaryBank.id,
    plaidItemId: primaryBank.plaid_item_id,
    fallbackReason: "PINNED_UNAVAILABLE"
  });
  
  return { 
    bankAccountId: primaryBank.id, 
    fallbackReason: "PINNED_UNAVAILABLE" 
  };
}

// Stub refund provider (to be implemented based on chosen provider)
async function issueRefund(params: {
  bankAccountId: string;
  plaidItemId: string;
  amountCents: number;
  orderId: string;
  customerId: string;
}): Promise<{ success: boolean; providerRef: string | null; error: string | null }> {
  // Normalize provider: trim whitespace and convert to lowercase to prevent " mock", "MOCK", etc. from hitting default
  const provider = (Deno.env.get("REFUND_PROVIDER") ?? "not_configured").trim().toLowerCase();
  
  console.log("[Refund] Provider:", provider);
  console.log("[Refund] Params:", {
    bankAccountId: params.bankAccountId,
    plaidItemId: params.plaidItemId,
    amountCents: params.amountCents,
    orderId: params.orderId
  });
  
  // Stub: Return failure until provider is configured
  switch (provider) {
    case "stripe":
      // TODO: Implement Stripe refund
      return {
        success: false,
        providerRef: null,
        error: "STRIPE_REFUND_NOT_IMPLEMENTED"
      };
    case "plaid_transfer":
      // TODO: Implement Plaid Transfer refund
      return {
        success: false,
        providerRef: null,
        error: "PLAID_TRANSFER_REFUND_NOT_IMPLEMENTED"
      };
    case "dwolla":
      // TODO: Implement Dwolla refund
      return {
        success: false,
        providerRef: null,
        error: "DWOLLA_REFUND_NOT_IMPLEMENTED"
      };
    case "mock":
      // Dev/testing mode: pretend the provider succeeded
      return {
        success: true,
        providerRef: `mock_refund_${params.orderId}_${Date.now()}`,
        error: null,
      };
    default:
      return {
        success: false,
        providerRef: null,
        error: "REFUND_PROVIDER_NOT_CONFIGURED"
      };
  }
}

Deno.serve(async (req) => {
  // 🚀 DEPLOYMENT MARKER - If you see this log, the new code is deployed
  console.log("🚀 process-refund DEPLOY v3 - safeJson enabled", new Date().toISOString());
  
  // Handle CORS preflight - MUST return 200 OK with proper headers
  // Do this FIRST before any other code that might throw
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

  // Wrap everything in try-catch to catch any errors
  try {
    console.log("[Refund] Request received:", {
      method: req.method,
      url: req.url,
      hasBody: !!req.body
    });
    
    const supabase = getSupabaseClient();
    
    // Log raw request URL for debugging
    console.log("[Refund] Raw URL:", req.url);
    console.log("[Refund] Request method:", req.method);
    console.log("[Refund] Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Parse request body safely - this should never throw
    let body: Record<string, any> = {};
    try {
      body = await safeJson(req);
      console.log("[Refund] Parsed body:", body);
    } catch (parseError: any) {
      console.error("[Refund] Error in safeJson (should not happen):", parseError);
      // Continue with empty body - safeJson should never throw, but just in case
      body = {};
    }
    
    // Get order_id from body or query string (fallback)
    const orderId = body.order_id ?? new URL(req.url).searchParams.get("order_id");
    
    if (!orderId) {
      console.error("[Refund] Missing order_id in request body and query string");
      return new Response(
        JSON.stringify({ 
          error: "Missing order_id", 
          received_body: body,
          query_params: Object.fromEntries(new URL(req.url).searchParams)
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    console.log("[Refund] Processing refund for order:", orderId);
    
    // Step 1: Load order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, bank_account_id, total_payment, status")
      .eq("id", orderId)
      .single();
    
    if (orderError || !order) {
      console.error("[Refund] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    // SECURITY: Verify caller owns the order (enforce ownership before processing)
    // Extract user ID from JWT token in Authorization header
    const authHeader = req.headers.get("authorization");
    let callerUserId: string | null = null;
    
    if (authHeader) {
      try {
        // Parse JWT token (basic extraction - Supabase JWT format)
        const token = authHeader.replace("Bearer ", "");
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          callerUserId = payload.sub || payload.user_id || null;
        }
      } catch (e) {
        console.warn("[Refund] Could not parse JWT token:", e);
      }
    }
    
    // Enforce ownership: order.customer_id must match caller's user ID
    if (callerUserId && order.customer_id !== callerUserId) {
      console.error("[Refund] Ownership violation:", {
        orderId: order.id,
        orderCustomerId: order.customer_id,
        callerUserId: callerUserId
      });
      return new Response(
        JSON.stringify({ 
          error: "Forbidden", 
          message: "You can only process refunds for your own orders"
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    // If no auth header, log warning but allow (for service role calls or dev mode)
    // In production, you should require JWT verification to be ON
    if (!authHeader) {
      console.warn("[Refund] No authorization header - allowing service role call");
    }
    
    // Step 2: Check if order is refundable
    // Only process refunds for cancelled orders (or orders that should be refunded)
    if (order.status !== "Cancelled") {
      console.log("[Refund] Order not cancelled, skipping refund:", {
        orderId: order.id,
        status: order.status
      });
      return new Response(
        JSON.stringify({ 
          message: "Order not cancelled, refund skipped",
          order_id: order.id,
          status: order.status
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    // Step 3: Check if refund already processed (idempotency)
    const { data: existingJob } = await supabase
      .from("refund_jobs")
      .select("id, status, provider_ref")
      .eq("order_id", orderId)
      .single();
    
    if (existingJob) {
      if (existingJob.status === "succeeded") {
        console.log("[Refund] Refund already succeeded, returning existing job:", existingJob.id);
        return new Response(
          JSON.stringify({ 
            message: "Refund already processed",
            job_id: existingJob.id,
            status: existingJob.status,
            provider_ref: existingJob.provider_ref
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
          }
        );
      }
      // If failed/processing, we'll retry below
      console.log("[Refund] Existing job found, will retry:", {
        jobId: existingJob.id,
        status: existingJob.status
      });
    }
    
    // Step 4: Determine refund destination (pinned → primary fallback)
    console.log("[Refund] Order details:", {
      orderId: order.id,
      customerId: order.customer_id,
      bankAccountId: order.bank_account_id,
      status: order.status
    });
    
    const { bankAccountId, fallbackReason } = await determineRefundDestination(
      supabase,
      order
    );
    
    // Step 5: Get bank account details for refund
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, plaid_item_id, bank_institution_name, is_primary")
      .eq("id", bankAccountId)
      .single();
    
    if (bankError || !bankAccount || !bankAccount.plaid_item_id) {
      throw new Error(
        `Bank account not found or invalid: ${bankAccountId}. ` +
        `Cannot process refund without plaid_item_id.`
      );
    }
    
    // Log refund destination details (for validation)
    console.log("[Refund] Refund destination determined:", {
      orderId: order.id,
      orderBankAccountId: order.bank_account_id,
      refundBankAccountId: bankAccountId,
      refundBankName: bankAccount.bank_institution_name,
      isPrimary: bankAccount.is_primary,
      fallbackReason: fallbackReason
    });
    
    // Step 6: Calculate refund amount (convert total_payment to cents)
    const amountCents = Math.round(Number(order.total_payment) * 100);
    
    // Step 7: Upsert refund_jobs row (idempotency)
    // Normalize provider for storage (same normalization as in issueRefund)
    const normalizedProvider = (Deno.env.get("REFUND_PROVIDER") ?? "not_configured").trim().toLowerCase();
    
    const jobData = {
      order_id: order.id,
      customer_id: order.customer_id,
      amount_cents: amountCents,
      status: "processing" as const,
      destination_bank_account_id: bankAccountId,
      fallback_reason: fallbackReason,
      provider: normalizedProvider, // Store normalized provider
      updated_at: new Date().toISOString()
    };
    
    const { data: refundJob, error: jobError } = await supabase
      .from("refund_jobs")
      .upsert(jobData, {
        onConflict: "order_id",
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (jobError || !refundJob) {
      throw new Error(`Failed to create refund job: ${jobError?.message}`);
    }
    
    console.log("[Refund] Refund job created:", {
      jobId: refundJob.id,
      orderId: order.id,
      amountCents,
      destinationBank: bankAccountId,
      fallbackReason
    });
    
    // Step 8: Call refund provider
    const refundResult = await issueRefund({
      bankAccountId,
      plaidItemId: bankAccount.plaid_item_id,
      amountCents,
      orderId: order.id,
      customerId: order.customer_id
    });
    
    // Step 9: Update job with result
    const finalStatus = refundResult.success ? "succeeded" : "failed";
    const { error: updateError } = await supabase
      .from("refund_jobs")
      .update({
        status: finalStatus,
        provider_ref: refundResult.providerRef,
        error: refundResult.error,
        updated_at: new Date().toISOString()
      })
      .eq("id", refundJob.id);
    
    if (updateError) {
      console.error("[Refund] Failed to update job status:", updateError);
    }
    
    if (!refundResult.success) {
      console.error("[Refund] Refund failed:", {
        jobId: refundJob.id,
        error: refundResult.error,
      });

      // If provider isn't configured yet (dev phase), don't break the cancel flow.
      // We still persist the refund_job as failed so you have an audit trail.
      const isNotConfigured = refundResult.error === "REFUND_PROVIDER_NOT_CONFIGURED";

      return new Response(
        JSON.stringify({
          success: false,
          job_id: refundJob.id,
          status: finalStatus,
          provider_error: refundResult.error,
          message: isNotConfigured
            ? "Refund provider not configured yet. Refund job recorded but no funds movement executed."
            : "Refund job created but provider returned error. Check refund_jobs table for details.",
        }),
        {
          status: isNotConfigured ? 200 : 500,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }
    
    console.log("[Refund] ✅ Refund succeeded:", {
      jobId: refundJob.id,
      providerRef: refundResult.providerRef
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        job_id: refundJob.id,
        status: finalStatus,
        provider_ref: refundResult.providerRef,
        amount_cents: amountCents,
        destination_bank_account_id: bankAccountId,
        fallback_reason: fallbackReason
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
    
  } catch (error: any) {
    console.error("[Refund] ❌ Error processing refund:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error",
        details: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
      }
    );
  }
});
