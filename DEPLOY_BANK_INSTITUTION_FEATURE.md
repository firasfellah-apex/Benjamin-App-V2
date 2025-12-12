# Deploy Bank Institution Feature - Complete Guide

## ✅ What's Already Done

1. ✅ Database migration file created: `supabase/migrations/20250128_add_bank_institution_fields.sql`
2. ✅ TypeScript types updated: `src/types/types.ts`
3. ✅ Frontend code updated: `src/pages/customer/BankAccounts.tsx`
4. ✅ Backend Edge Function updated: `supabase/functions/plaid/index.ts`

## 🚀 Quick Deployment (2 Steps)

### Step 1: Apply Database Migration

**Go to Supabase Dashboard → SQL Editor and run this SQL:**

```sql
-- Add bank institution fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_name text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_institution_logo_url text;

CREATE INDEX IF NOT EXISTS idx_profiles_bank_institution_name ON profiles(bank_institution_name) WHERE bank_institution_name IS NOT NULL;
```

**Or copy from file:** `supabase/migrations/20250128_add_bank_institution_fields.sql`

### Step 2: Deploy Edge Function

**Option A: Using Supabase CLI**
```bash
supabase functions deploy plaid
```

**Option B: Using Supabase Dashboard**
1. Go to **Edge Functions** in Supabase Dashboard
2. Find the `plaid` function
3. Click **Edit** or **Deploy new version**
4. Copy the entire contents of `supabase/functions/plaid/index.ts`
5. Paste and deploy

## ✅ Verification

After deploying, test by:
1. Disconnecting your bank account (if connected)
2. Reconnecting your bank account via Plaid
3. Checking "My Bank Accounts" page - you should see bank name and logo

## 🔍 What the Code Does

### Backend (Edge Function)
When a user connects their bank:
1. Exchanges Plaid public token for access token
2. Gets the `institution_id` from the Plaid item
3. Calls Plaid's `/institutions/get_by_id` to fetch:
   - Institution name (e.g., "Chase", "Bank of America")
   - Institution logo (base64-encoded PNG, converted to data URL)
4. Stores both in the `profiles` table

### Frontend
- Displays bank name instead of "Primary bank"
- Shows bank logo if available
- Falls back to generic icon if logo not available

## 📝 Files Changed

- `supabase/migrations/20250128_add_bank_institution_fields.sql` - Database migration
- `src/types/types.ts` - Added `bank_institution_name` and `bank_institution_logo_url` fields
- `src/pages/customer/BankAccounts.tsx` - Updated to use typed fields
- `supabase/functions/plaid/index.ts` - Added institution data fetching

## 🐛 Troubleshooting

**If bank name/logo still not showing after reconnecting:**
1. Check Supabase logs for the Edge Function to see if institution data was fetched
2. Verify the migration was applied: Run `SELECT bank_institution_name FROM profiles WHERE plaid_item_id IS NOT NULL LIMIT 1;`
3. Check browser console for any errors
4. Verify the Edge Function was deployed successfully

