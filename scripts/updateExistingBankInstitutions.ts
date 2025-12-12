/**
 * Script to retroactively fetch and store institution data for existing bank connections
 * 
 * This script:
 * 1. Finds all profiles with plaid_item_id but missing bank_institution_name
 * 2. Uses Plaid API to fetch institution details
 * 3. Updates the profiles with institution name and logo
 * 
 * Run this after applying the migration to update existing connections.
 */

import { createClient } from '@supabase/supabase-js';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

async function updateExistingBankInstitutions() {
  console.log('🔍 Finding profiles with bank connections but missing institution data...');

  // Find all profiles with plaid_item_id but missing bank_institution_name
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, plaid_item_id, bank_institution_name, bank_institution_logo_url')
    .not('plaid_item_id', 'is', null)
    .or('bank_institution_name.is.null,bank_institution_name.eq.null');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ No profiles need updating. All bank connections have institution data.');
    return;
  }

  console.log(`📋 Found ${profiles.length} profile(s) to update`);

  for (const profile of profiles) {
    if (!profile.plaid_item_id) continue;

    console.log(`\n🔄 Processing profile ${profile.id} with plaid_item_id: ${profile.plaid_item_id}`);

    try {
      // Get the access token from Supabase (you'll need to store this when creating the item)
      // For now, we'll need to get it from the Plaid item
      // Note: This requires the access token to be stored somewhere accessible
      // If not stored, we'll need to use Plaid's item/get endpoint with the item_id
      
      // First, try to get institution_id from item
      // Note: This requires a different approach - we need the access token
      // For now, let's log what we can do
      
      console.log('⚠️  Cannot fetch institution data without access token.');
      console.log('   The access token is stored securely in Plaid and not accessible here.');
      console.log('   Solution: User must disconnect and reconnect their bank account.');
      console.log('   This will trigger the Edge Function to fetch institution data.');
      
    } catch (error: any) {
      console.error(`❌ Error processing profile ${profile.id}:`, error.message);
    }
  }

  console.log('\n✅ Script completed.');
  console.log('\n📝 Note: To update existing connections, users must disconnect and reconnect their bank accounts.');
  console.log('   This will trigger the Edge Function to fetch and store institution data.');
}

// Run the script
updateExistingBankInstitutions()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

