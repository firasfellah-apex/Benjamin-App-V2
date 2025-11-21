// Supabase Edge Function for Plaid KYC integration
// Handles: create-link-token and exchange-public-token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from "https://esm.sh/plaid@27.0.0";

// Initialize Plaid client
function getPlaidClient() {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = Deno.env.get("PLAID_ENV") || "sandbox";

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

// Initialize Supabase client
function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Route: /create-link-token
    if (path === "create-link-token" && req.method === "POST") {
      const plaidClient = getPlaidClient();

      const linkTokenResponse = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: user.id,
        },
        client_name: "Benjamin",
        products: [Products.Auth, Products.Identity],
        country_codes: [CountryCode.Us],
        language: "en",
      });

      return new Response(
        JSON.stringify({ link_token: linkTokenResponse.data.link_token }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Route: /exchange-public-token
    if (path === "exchange-public-token" && req.method === "POST") {
      const body = await req.json();
      const { public_token } = body;

      if (!public_token) {
        return new Response(
          JSON.stringify({ error: "Missing public_token" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      const plaidClient = getPlaidClient();

      // Exchange public token for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token,
      });

      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;

      // Get Auth data to confirm we have a valid bank account
      const authResponse = await plaidClient.authGet({
        access_token: accessToken,
      });

      console.log("[Plaid] Auth data:", {
        accounts_count: authResponse.data.accounts.length,
        item_id: itemId,
      });

      // Get Identity data for KYC
      const identityResponse = await plaidClient.identityGet({
        access_token: accessToken,
      });

      const identity = identityResponse.data;
      const accounts = identity.accounts || [];
      
      // Extract legal name from identity (use first account's owner)
      let plaidLegalName: string | null = null;
      if (accounts.length > 0 && accounts[0].owners && accounts[0].owners.length > 0) {
        const owner = accounts[0].owners[0];
        if (owner.names && owner.names.length > 0) {
          plaidLegalName = owner.names[0];
        }
      }

      // Get user's profile from Supabase
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, kyc_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profile" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      // Compare names (case-insensitive)
      const profileFullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      const plaidName = plaidLegalName || "";
      const plaidEnv = Deno.env.get("PLAID_ENV") || "sandbox";

      // Only enforce name matching when NOT in sandbox
      if (plaidEnv !== "sandbox") {
        if (!plaidName || !profileFullName) {
          return new Response(
            JSON.stringify({
              error: "Name comparison failed: missing name data",
              debug: {
                profile_name: profileFullName,
                plaid_name: plaidName,
              },
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
        const namesMatch =
          profileFullName.toLowerCase().trim() === plaidName.toLowerCase().trim();
        if (!namesMatch) {
          return new Response(
            JSON.stringify({
              error: "Name mismatch: Plaid name does not match profile name",
              debug: {
                profile_name: profileFullName,
                plaid_name: plaidName,
              },
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      } else {
        console.log("[Plaid] Sandbox mode: Name comparison skipped", {
          profile_name: profileFullName,
          plaid_name: plaidName,
        });
      }

      // Update KYC status in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          kyc_status: "verified",
          kyc_verified_at: new Date().toISOString(),
          plaid_item_id: itemId,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("[Plaid] Error updating profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update KYC status" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          kyc_status: "verified",
          plaid_item_id: itemId,
          debug: {
            names: [profileFullName, plaidName],
            accounts_count: authResponse.data.accounts.length,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error: any) {
    console.error("[Plaid Edge Function] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

