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

// CORS headers helper
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(),
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
          headers: { "Content-Type": "application/json", ...getCorsHeaders() },
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
          headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        }
      );
    }

    const url = new URL(req.url);
    // Try to get path from URL first
    let path = url.pathname.split("/").pop();
    
    // If path is "plaid" (from supabase.functions.invoke), read body to get actual path
    // We need to read body once and reuse it
    let requestBody: any = null;
    if (path === "plaid" || !path) {
      try {
        requestBody = await req.json();
        path = requestBody.path || path;
        console.log("[Plaid Edge Function] Path from body:", path);
      } catch (e) {
        console.error("[Plaid Edge Function] Failed to parse body:", e);
        // If body parsing fails, continue with URL path
      }
    }

    console.log("[Plaid Edge Function] Request path:", path);
    console.log("[Plaid Edge Function] Request URL:", req.url);
    console.log("[Plaid Edge Function] Request method:", req.method);

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
          headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        }
      );
    }

    // Route: /exchange-public-token
    if (path === "exchange-public-token" && req.method === "POST") {
      // Use the body we already parsed, or parse it if we haven't yet
      let body: any = requestBody;
      if (!body) {
        try {
          body = await req.json();
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...getCorsHeaders() },
            }
          );
        }
      }
      
      console.log("[Plaid Edge Function] Exchange request body:", {
        has_public_token: !!body.public_token,
        has_institution_id: !!body.institution_id,
        path_from_body: body.path,
      });
      
      const { public_token, institution_id: metadataInstitutionId } = body;

      if (!public_token) {
        return new Response(
          JSON.stringify({ error: "Missing public_token" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
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

      // Get item details to get institution_id
      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      });

      // Try to get institution_id from item response, fallback to metadata if null
      let institutionId = itemResponse.data.item.institution_id;
      if (!institutionId && metadataInstitutionId) {
        console.log("[Plaid] Using institution_id from metadata fallback:", metadataInstitutionId);
        institutionId = metadataInstitutionId;
      }

      // Also get institution_name from item response as fallback (available in item response)
      const itemInstitutionName = itemResponse.data.item.institution_name || null;

      // Get Auth data to confirm we have a valid bank account and get account details
      const authResponse = await plaidClient.authGet({
        access_token: accessToken,
      });

      // Extract account last4 from auth response (first account)
      let accountLast4: string | null = null;
      if (authResponse.data.accounts && authResponse.data.accounts.length > 0) {
        const firstAccount = authResponse.data.accounts[0];
        accountLast4 = firstAccount.mask || null;
      }

      console.log("[Plaid] Item and Auth data:", {
        accounts_count: authResponse.data.accounts.length,
        item_id: itemId,
        institution_id: institutionId,
        item_response_keys: Object.keys(itemResponse.data.item),
        item_full: JSON.stringify(itemResponse.data.item, null, 2),
      });

      // CRITICAL: Log if institution_id is missing
      if (!institutionId) {
        console.error("[Plaid] CRITICAL ERROR: institution_id is NULL in item response!");
        console.error("[Plaid] This means we cannot fetch institution details.");
        console.error("[Plaid] Item response structure:", JSON.stringify(itemResponse.data, null, 2));
      }

      // Fetch institution details including logo
      let institutionName: string | null = null;
      let institutionLogoUrl: string | null = null;

      if (!institutionId) {
        console.warn("[Plaid] WARNING: No institution_id found in item response!");
        console.warn("[Plaid] Item response:", JSON.stringify(itemResponse.data, null, 2));
      } else {
        try {
          console.log("[Plaid] Fetching institution details for institution_id:", institutionId);
          const institutionResponse = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: [CountryCode.Us],
            options: {
              include_display_data: true, // This includes the logo (can't use include_optional_metadata with this)
            },
          });

          const institution = institutionResponse.data.institution;
          institutionName = institution.name || itemInstitutionName || null; // Use item name as fallback

          // Convert base64 logo to data URL
          if (institution.logo) {
            institutionLogoUrl = `data:image/png;base64,${institution.logo}`;
            console.log("[Plaid] Logo converted, length:", institutionLogoUrl.length);
          } else {
            institutionLogoUrl = null; // Explicitly null, not undefined
            console.log("[Plaid] No logo in institution response");
          }

          console.log("[Plaid] Institution data fetched successfully:", {
            name: institutionName,
            has_logo: !!institution.logo,
            logo_url_length: institutionLogoUrl ? institutionLogoUrl.length : 0,
            institution_response: JSON.stringify(institutionResponse.data, null, 2),
          });
        } catch (institutionError: any) {
          // Log error but don't fail the entire flow
          console.error("[Plaid] ERROR fetching institution data:", institutionError);
          console.error("[Plaid] Error details:", JSON.stringify(institutionError, null, 2));
          // Continue without institution data - it's optional
        }
      }

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

      // Get user's profile from Supabase (include bank fields for migration)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, kyc_status, plaid_item_id, bank_institution_name, bank_institution_logo_url, kyc_verified_at")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profile" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
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
                ...getCorsHeaders(),
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
                ...getCorsHeaders(),
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

      // Check if user already has bank accounts
      let { data: existingBanks, error: checkError } = await supabase
        .from("bank_accounts")
        .select("id, plaid_item_id, bank_institution_name")
        .eq("user_id", user.id);

      if (checkError) {
        if (checkError.code === 'PGRST205' || checkError.message?.includes('does not exist') || checkError.message?.includes('relation "bank_accounts"') || checkError.message?.includes('schema cache')) {
          console.error("[Plaid] ❌ CRITICAL: bank_accounts table does not exist! Migration 20250129_create_bank_accounts_table.sql must be run first.");
          console.error("[Plaid] Falling back to profiles table (only ONE bank account supported)");
        } else {
          console.error("[Plaid] Error checking existing bank accounts:", checkError);
        }
      } else {
        console.log("[Plaid] Found existing bank accounts:", {
          count: existingBanks?.length || 0,
          banks: existingBanks?.map(b => ({
            id: b.id,
            plaid_item_id: b.plaid_item_id,
            institution_name: b.bank_institution_name,
          })),
        });
      }

      // MIGRATION: If no banks in bank_accounts but profile has plaid_item_id, migrate it
      if ((!existingBanks || existingBanks.length === 0) && profile.plaid_item_id) {
        console.log("[Plaid] 🔄 Migrating legacy bank from profiles table to bank_accounts table");
        console.log("[Plaid] Legacy bank data:", {
          plaid_item_id: profile.plaid_item_id,
          institution_name: (profile as any).bank_institution_name,
          has_logo: !!(profile as any).bank_institution_logo_url,
        });

        // Migrate the existing bank from profiles to bank_accounts
        const legacyBankData: any = {
          user_id: user.id,
          plaid_item_id: profile.plaid_item_id,
          kyc_status: profile.kyc_status || "verified",
          kyc_verified_at: (profile as any).kyc_verified_at || new Date().toISOString(),
          is_primary: true, // First bank is always primary
          updated_at: new Date().toISOString(),
        };

        if ((profile as any).bank_institution_name) {
          legacyBankData.bank_institution_name = (profile as any).bank_institution_name;
        }
        if ((profile as any).bank_institution_logo_url) {
          legacyBankData.bank_institution_logo_url = (profile as any).bank_institution_logo_url;
        }

        const { error: migrateError, data: migratedBank } = await supabase
          .from("bank_accounts")
          .upsert(legacyBankData, {
            onConflict: 'user_id,plaid_item_id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (migrateError) {
          console.error("[Plaid] Error migrating legacy bank:", migrateError);
        } else {
          console.log("[Plaid] ✅ Successfully migrated legacy bank:", {
            bank_account_id: migratedBank?.id,
            plaid_item_id: migratedBank?.plaid_item_id,
            institution_name: migratedBank?.bank_institution_name,
          });
          
          // Re-fetch existing banks after migration
          const { data: banksAfterMigration } = await supabase
            .from("bank_accounts")
            .select("id, plaid_item_id, bank_institution_name")
            .eq("user_id", user.id);
          
          if (banksAfterMigration) {
            existingBanks = banksAfterMigration;
            console.log("[Plaid] Banks after migration:", existingBanks.length);
          }
        }
      }

      const isFirstBank = !existingBanks || existingBanks.length === 0;
      
      // Check if this plaid_item_id already exists for this user
      const existingBankWithSamePlaidId = existingBanks?.find(b => b.plaid_item_id === itemId);
      if (existingBankWithSamePlaidId) {
        console.log("[Plaid] ⚠️ This Plaid item is already connected. Will update existing bank account:", existingBankWithSamePlaidId.id);
      } else {
        console.log("[Plaid] ✅ New Plaid item - will create new bank account entry");
      }

      // Insert bank account into bank_accounts table
      const bankAccountData: any = {
        user_id: user.id,
        plaid_item_id: itemId,
        kyc_status: "verified",
        kyc_verified_at: new Date().toISOString(),
        is_primary: isFirstBank, // First bank account is primary
        updated_at: new Date().toISOString(),
      };

      // Add institution fields if available
      if (institutionName !== null && institutionName !== undefined) {
        bankAccountData.bank_institution_name = institutionName;
      }
      if (institutionLogoUrl !== null && institutionLogoUrl !== undefined) {
        bankAccountData.bank_institution_logo_url = institutionLogoUrl;
      }
      if (accountLast4) {
        bankAccountData.bank_last4 = accountLast4;
      }

      console.log("[Plaid] Inserting bank account:", {
        user_id: user.id,
        plaid_item_id: itemId,
        is_primary: isFirstBank,
        has_name: institutionName !== null && institutionName !== undefined,
        has_logo: institutionLogoUrl !== null && institutionLogoUrl !== undefined,
        has_last4: !!accountLast4,
      });

      // Try to insert into bank_accounts table (upsert in case it already exists)
      console.log("[Plaid] Attempting to upsert bank account into bank_accounts table:", {
        user_id: user.id,
        plaid_item_id: itemId,
        is_primary: isFirstBank,
        has_institution_name: !!institutionName,
        has_institution_logo: !!institutionLogoUrl,
      });
      
      // Validate plaid_item_id is present before insert
      if (!itemId) {
        console.error("[Plaid] ❌ CRITICAL: itemId is missing! Cannot insert bank account without plaid_item_id");
        return new Response(
          JSON.stringify({ 
            error: "Missing Plaid item ID",
            details: "plaid_item_id is required but was not provided"
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("[Plaid] 💾 Bank account data before upsert:", JSON.stringify(bankAccountData, null, 2));

      const { error: bankAccountError, data: bankAccountResult } = await supabase
        .from("bank_accounts")
        .upsert(bankAccountData, {
          onConflict: 'user_id,plaid_item_id',
          ignoreDuplicates: false,
        })
        .select();

      if (bankAccountError) {
        console.error("[Plaid] ❌ Bank account upsert error:", {
          code: bankAccountError.code,
          message: bankAccountError.message,
          details: bankAccountError.details,
          hint: bankAccountError.hint,
          fullError: JSON.stringify(bankAccountError, null, 2),
          bankAccountData: JSON.stringify(bankAccountData, null, 2),
        });
        // If bank_accounts table doesn't exist, fall back to profiles table
        if (bankAccountError.code === 'PGRST205' || bankAccountError.message?.includes('does not exist') || bankAccountError.message?.includes('relation "bank_accounts"') || bankAccountError.message?.includes('schema cache')) {
          console.error("[Plaid] ❌ CRITICAL ERROR: bank_accounts table does not exist!");
          console.error("[Plaid] Error code:", bankAccountError.code);
          console.error("[Plaid] Error message:", bankAccountError.message);
          console.error("[Plaid] ⚠️ Falling back to profiles table (only ONE bank account supported)");
          console.error("[Plaid] 🔧 ACTION REQUIRED: Run migration 20250129_create_bank_accounts_table.sql");
          
          // Fallback: Update profiles table (legacy behavior)
          let updateData: any = {
            kyc_status: "verified",
            kyc_verified_at: new Date().toISOString(),
            plaid_item_id: itemId,
            updated_at: new Date().toISOString(),
          };

          if (institutionName !== null && institutionName !== undefined) {
            updateData.bank_institution_name = institutionName;
          }
          if (institutionLogoUrl !== null && institutionLogoUrl !== undefined) {
            updateData.bank_institution_logo_url = institutionLogoUrl;
          }

          // WARNING: This fallback only supports ONE bank account
          // If user already has a bank, this will REPLACE it
          console.warn("[Plaid] ⚠️ WARNING: Using profile table fallback - only ONE bank account can be stored. Run migration 20250129_create_bank_accounts_table.sql to support multiple banks.");
          
          const { error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", user.id);

          if (updateError) {
            console.error("[Plaid] Error updating profile (fallback):", updateError);
            return new Response(
              JSON.stringify({ 
                error: "Failed to save bank account",
                details: updateError.message,
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...getCorsHeaders() },
              }
            );
          }
          
          console.log("[Plaid] ✅ Bank account saved to profile table (legacy mode - only one bank supported)");
        } else {
          console.error("[Plaid] Error inserting bank account:", bankAccountError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to save bank account",
              details: bankAccountError.message,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...getCorsHeaders() },
            }
          );
        }
      } else {
        const savedBanks = Array.isArray(bankAccountResult) ? bankAccountResult : (bankAccountResult ? [bankAccountResult] : []);
        const savedBank = savedBanks[0];
        
        // Fetch all bank accounts for this user to verify
        const { data: allBanksAfterInsert, error: fetchError } = await supabase
          .from("bank_accounts")
          .select("id, plaid_item_id, bank_institution_name, is_primary")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: false });
        
        console.log("[Plaid] ✅ Bank account saved successfully:", {
          bank_account_id: savedBank?.id,
          is_primary: savedBank?.is_primary,
          plaid_item_id: itemId,
          institution_name: savedBank?.bank_institution_name,
        });
        
        if (!fetchError && allBanksAfterInsert) {
          console.log("[Plaid] 📊 Total bank accounts for user after insert:", {
            total_count: allBanksAfterInsert.length,
            banks: allBanksAfterInsert.map(b => ({
              id: b.id,
              plaid_item_id: b.plaid_item_id,
              institution_name: b.bank_institution_name,
              is_primary: b.is_primary,
            })),
          });
        } else if (fetchError) {
          console.warn("[Plaid] Could not verify total bank accounts:", fetchError);
        }
      }

      // Also update profile KYC status (for backward compatibility)
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          kyc_status: "verified",
          kyc_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileUpdateError) {
        console.warn("[Plaid] Warning: Could not update profile KYC status:", profileUpdateError);
        // Don't fail - bank account was saved successfully
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
          headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...getCorsHeaders() },
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
        headers: { "Content-Type": "application/json", ...getCorsHeaders() },
      }
    );
  }
});

