/**
 * Script to apply the bank institution fields migration
 * This adds bank_institution_name and bank_institution_logo_url columns to profiles table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getEnv } from '../src/lib/env';

async function applyMigration() {
  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250128_add_bank_institution_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying migration: bank_institution_fields');
    console.log('Migration SQL:', migrationSQL);

    // Execute the migration using RPC or direct SQL
    // Note: This requires service_role key or admin access
    // For production, apply via Supabase Dashboard SQL Editor
    
    console.log('\n✅ Migration file is ready to apply');
    console.log('\n📋 To apply this migration:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL from: supabase/migrations/20250128_add_bank_institution_fields.sql');
    console.log('4. Click "Run"');
    console.log('\nOr use Supabase CLI:');
    console.log('  supabase db push');
    
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigration().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { applyMigration };

