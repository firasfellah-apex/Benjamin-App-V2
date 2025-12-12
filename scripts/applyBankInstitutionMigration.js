/**
 * Script to apply the bank institution fields migration
 * Run with: node scripts/applyBankInstitutionMigration.js
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 * Or update the script with your service role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationSQL = `
-- Add bank institution fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_name text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_logo_url text;

CREATE INDEX IF NOT EXISTS idx_profiles_bank_institution_name ON profiles(bank_institution_name) WHERE bank_institution_name IS NOT NULL;
`;

async function applyMigration() {
  try {
    // Get Supabase URL and service role key from environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_CUSTOMER_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error('❌ SUPABASE_URL or VITE_CUSTOMER_SUPABASE_URL not found in environment');
      console.log('\n📋 Manual Application Required:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the SQL from: supabase/migrations/20250128_add_bank_institution_fields.sql');
      console.log('3. Click "Run"');
      return false;
    }

    if (!serviceRoleKey) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found');
      console.log('\n📋 Manual Application Required (service role key needed for programmatic migration):');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the SQL from: supabase/migrations/20250128_add_bank_institution_fields.sql');
      console.log('3. Click "Run"');
      return false;
    }

    console.log('🔧 Applying migration via Supabase client...');
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute migration using RPC (if available) or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative method - direct SQL execution
      console.log('Trying alternative method...');
      // Note: Direct SQL execution requires admin access
      // For now, provide manual instructions
      console.log('\n📋 Please apply migration manually:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste this SQL:');
      console.log(migrationSQL);
      console.log('3. Click "Run"');
      return false;
    }

    console.log('✅ Migration applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual Application Required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the SQL from: supabase/migrations/20250128_add_bank_institution_fields.sql');
    console.log('3. Click "Run"');
    return false;
  }
}

applyMigration().then((success) => {
  if (success) {
    console.log('\n✅ Next step: Deploy the updated Edge Function');
    console.log('Run: supabase functions deploy plaid');
  }
  process.exit(success ? 0 : 1);
});

