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

  const functionUrl = getFunctionUrl();
  const response = await fetch(`${functionUrl}/create-link-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create link token");
  }

  const data = await response.json();
  return data.link_token;
}

/**
 * Exchange a Plaid public token for access token and perform KYC verification
 * @param publicToken Public token from Plaid Link onSuccess callback
 * @returns KYC verification result
 */
export async function exchangePublicToken(publicToken: string): Promise<{
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

  const functionUrl = getFunctionUrl();
  const response = await fetch(`${functionUrl}/exchange-public-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ public_token: publicToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to exchange public token");
  }

  return await response.json();
}

