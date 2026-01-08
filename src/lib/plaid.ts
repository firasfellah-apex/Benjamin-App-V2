/**
 * Client-side Plaid API wrapper
 * Calls Supabase Edge Functions for secure server-side Plaid operations
 */

import { supabase } from "@/db/supabase";
import { getEnv } from "@/lib/env";

/**
 * Get the Supabase function URL for the current app
 */
function getFunctionUrl(): string {
  // Use the current Supabase URL from the env selector
  const env = getEnv();
  return `${env.SUPABASE_URL}/functions/v1/plaid`;
}

/**
 * Create a Plaid Link token
 * @returns Link token for initializing Plaid Link
 */
export async function createLinkToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  console.log("[Plaid] 🔗 Calling Edge Function: plaid/create-link-token");
  console.log("[Plaid] Supabase URL:", supabase.supabaseUrl);

  try {
    const { data, error } = await supabase.functions.invoke('plaid', {
      body: { 
        path: 'create-link-token',
        method: 'POST'
      }
    });

    if (error) {
      console.error("[Plaid] ❌ Edge Function error:", {
        message: error.message,
        context: error.context,
        fullError: JSON.stringify(error, null, 2),
      });
      throw new Error(error.message || "Failed to create link token");
    }

    if (!data || !data.link_token) {
      console.error("[Plaid] ❌ Invalid response from Edge Function:", data);
      throw new Error("Invalid response from server");
    }

    console.log("[Plaid] ✅ Link token received:", data.link_token.substring(0, 20) + '...');
    return data.link_token;
  } catch (err: any) {
    console.error("[Plaid] ❌ Exception calling Edge Function:", {
      message: err.message,
      stack: err.stack,
      fullError: JSON.stringify(err, null, 2),
    });
    throw err;
  }
}

/**
 * Exchange a Plaid public token for access token and perform KYC verification
 * @param publicToken Public token from Plaid Link onSuccess callback
 * @returns KYC verification result
 */
export async function exchangePublicToken(
  publicToken: string,
  metadata?: { institution?: { institution_id?: string } }
): Promise<{
  ok: boolean;
  kyc_status: string;
  plaid_item_id: string;
  debug?: {
    names: string[];
    accounts_count: number;
  };
}> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  console.log("[Plaid] 🔄 Calling Edge Function: plaid/exchange-public-token");
  console.log("[Plaid] Public token:", publicToken.substring(0, 20) + '...');
  console.log("[Plaid] Institution ID from metadata:", metadata?.institution?.institution_id);
  console.log("[Plaid] Supabase URL:", supabase.supabaseUrl);

  try {
    const { data, error } = await supabase.functions.invoke('plaid', {
      body: { 
        path: 'exchange-public-token',
        method: 'POST',
        public_token: publicToken,
        // Pass institution_id from metadata as fallback if available
        institution_id: metadata?.institution?.institution_id || undefined,
      }
    });

    if (error) {
      console.error("[Plaid] ❌ Edge Function error:", {
        message: error.message,
        context: error.context,
        fullError: JSON.stringify(error, null, 2),
      });
      
      // Try to get error details from response if available
      if (error.context && typeof error.context === 'object' && 'response' in error.context) {
        try {
          const response = error.context.response as Response;
          const errorBody = await response.clone().json().catch(() => ({}));
          console.error("[Plaid] ❌ Error response body:", errorBody);
        } catch (e) {
          console.error("[Plaid] ❌ Could not parse error response");
        }
      }
      
      throw new Error(error.message || "Failed to exchange public token");
    }

    if (!data) {
      console.error("[Plaid] ❌ No data returned from Edge Function");
      throw new Error("No data returned from server");
    }

    console.log("[Plaid] ✅ Exchange successful:", {
      kyc_status: data.kyc_status,
      plaid_item_id: data.plaid_item_id,
      ok: data.ok,
    });

    return data;
  } catch (err: any) {
    console.error("[Plaid] ❌ Exception calling Edge Function:", {
      message: err.message,
      stack: err.stack,
      fullError: JSON.stringify(err, null, 2),
    });
    throw err;
  }
}

