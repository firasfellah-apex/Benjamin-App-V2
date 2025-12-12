# Apply Bank Institution Migration

## Quick Steps to Enable Bank Logo & Name Display

### Step 1: Apply Database Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the following SQL:

```sql
-- Add bank institution fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_name text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_logo_url text;

CREATE INDEX IF NOT EXISTS idx_profiles_bank_institution_name ON profiles(bank_institution_name) WHERE bank_institution_name IS NOT NULL;
```

4. Click **Run**

**Option B: Via Supabase CLI**
```bash
supabase db push
```

### Step 2: Deploy Updated Edge Function

The Edge Function at `supabase/functions/plaid/index.ts` has been updated to fetch and store institution data.

**Deploy using Supabase CLI:**
```bash
supabase functions deploy plaid
```

**Or via Supabase Dashboard:**
1. Go to **Edge Functions** in your Supabase Dashboard
2. Find the `plaid` function
3. Update it with the code from `supabase/functions/plaid/index.ts`

### Step 3: Test

1. Disconnect your current bank account (if connected)
2. Reconnect your bank account via Plaid
3. Check the "My Bank Accounts" page - you should now see:
   - Bank name (e.g., "Chase", "Bank of America")
   - Bank logo (if available from Plaid)

## What Changed

### Database
- Added `bank_institution_name` column to `profiles` table
- Added `bank_institution_logo_url` column to `profiles` table
- Added index on `bank_institution_name` for faster queries

### Backend (Edge Function)
- Fetches institution ID from Plaid item
- Calls Plaid's `/institutions/get_by_id` endpoint to get name and logo
- Stores institution data when exchanging public token

### Frontend
- Updated TypeScript types to include institution fields
- Updated UI to display bank name and logo when available

## Verification

After applying the migration and deploying the function, verify with:

```sql
SELECT 
  id,
  first_name,
  plaid_item_id,
  bank_institution_name,
  bank_institution_logo_url IS NOT NULL as has_logo
FROM profiles
WHERE plaid_item_id IS NOT NULL;
```

You should see `bank_institution_name` populated for users with connected banks.

