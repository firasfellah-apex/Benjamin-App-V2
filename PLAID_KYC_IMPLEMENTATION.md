# Plaid KYC Implementation Summary

## Overview

This implementation adds Plaid KYC (Know Your Customer) and bank account linking to Benjamin without breaking existing logic. The integration uses:

- **Plaid Auth** - to link bank accounts
- **Plaid Identity Match / Identity** - for basic KYC (name matching, address verification)

All Plaid secrets are kept server-side via Supabase Edge Functions.

## Files Created/Modified

### Database
- `supabase/migrations/20250120_add_plaid_kyc_fields.sql` - Adds `kyc_verified_at` and `plaid_item_id` columns to profiles table

### Backend (Supabase Edge Functions)
- `supabase/functions/plaid/index.ts` - Edge Function handling:
  - `POST /create-link-token` - Creates Plaid Link token for frontend
  - `POST /exchange-public-token` - Exchanges public token, performs KYC verification, updates profile

### Frontend
- `src/lib/plaid.ts` - Client-side API wrapper for calling Edge Functions
- `src/pages/customer/PlaidLinkTest.tsx` - Debug test page for KYC flow
- `src/types/types.ts` - Updated `KYCStatus` type and `Profile` interface
- `src/routes.tsx` - Added route for `/customer/debug/plaid-link`
- `src/pages/admin/UserManagement.tsx` - Updated to show KYC status badges and details

### Dependencies
- `plaid` - Plaid Node SDK (for Edge Functions)
- `react-plaid-link` - React component for Plaid Link

## Database Schema Changes

The `profiles` table now includes:
- `kyc_status` (TEXT) - Values: `'unverified'`, `'pending'`, `'verified'`, `'failed'`
- `kyc_verified_at` (TIMESTAMPTZ, nullable) - Timestamp when KYC was verified
- `plaid_item_id` (TEXT, nullable) - Plaid item ID after bank linking

## Environment Variables

Add these to your Supabase Edge Function secrets (via Supabase Dashboard or CLI):

```bash
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # or 'development' or 'production'
```

Also ensure these are in your `.env.local` (already in `.env.example`):
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `PLAID_PUBLIC_KEY` (optional, for frontend if needed)

## How to Run the Plaid Test Page Locally

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:5173/customer/debug/plaid-link
   ```

3. **Make sure you're logged in** as a customer user

## How to Trigger a Full Sandbox KYC Flow End-to-End

1. **Deploy the Edge Function:**
   ```bash
   # Using Supabase CLI
   supabase functions deploy plaid
   
   # Set secrets
   supabase secrets set PLAID_CLIENT_ID=your_client_id
   supabase secrets set PLAID_SECRET=your_secret
   supabase secrets set PLAID_ENV=sandbox
   ```

2. **Run the database migration:**
   ```bash
   # Apply the migration
   supabase migration up
   # Or apply manually via Supabase Dashboard SQL Editor
   ```

3. **Navigate to the test page:**
   - Go to `/customer/debug/plaid-link`
   - Click "Start KYC with Plaid"
   - Click "Open Plaid Link"
   - Use Plaid sandbox credentials:
     - Username: `user_good`
     - Password: `pass_good`
   - Select any bank (e.g., "First Platypus Bank")
   - Complete the flow
   - On success, your KYC status will update to "verified"

4. **Verify in Admin:**
   - Go to `/admin/users`
   - Find your user in the Customers tab
   - Click "Manage" to see KYC status, verification date, and Plaid item ID

## KYC Flow Details

1. **Create Link Token:**
   - User clicks "Start KYC with Plaid"
   - Frontend calls Edge Function `/create-link-token`
   - Edge Function creates Plaid Link token with user's ID
   - Returns `link_token` to frontend

2. **Plaid Link Flow:**
   - Frontend initializes Plaid Link with `link_token`
   - User selects bank and logs in via Plaid
   - Plaid returns `public_token` on success

3. **Exchange & Verify:**
   - Frontend calls Edge Function `/exchange-public-token` with `public_token`
   - Edge Function:
     - Exchanges `public_token` for `access_token` and `item_id`
     - Calls `authGet()` to confirm bank account
     - Calls `identityGet()` to get user's legal name
     - Compares Plaid name with Supabase profile name (case-insensitive)
     - If match: Updates profile with `kyc_status='verified'`, `kyc_verified_at`, `plaid_item_id`
     - If mismatch: Returns 400 error with details

## Admin UI Updates

The admin User Management page now shows:
- **KYC Status Badge** in the user list (Unverified/Pending/Verified/Failed)
- **KYC Details** in the user detail dialog:
  - Current KYC status
  - Verification timestamp (if verified)
  - Plaid item ID (if linked)

## Security Notes

- ✅ All Plaid secrets stay server-side (Edge Functions)
- ✅ All endpoints require Supabase authentication
- ✅ User can only create link tokens for themselves
- ✅ User can only exchange tokens for their own account
- ✅ Name matching prevents identity fraud

## TODO / Future Enhancements

- [ ] Add more sophisticated KYC rules (address matching, etc.)
- [ ] Integrate with Coastal / Marqeta for funding
- [ ] Add KYC status checks before allowing cash requests
- [ ] Add retry logic for failed KYC attempts
- [ ] Add webhook handling for Plaid status updates

## Troubleshooting

**Edge Function not found:**
- Make sure you've deployed the function: `supabase functions deploy plaid`
- Check that the function URL matches your Supabase project URL

**"Missing authorization header" error:**
- Ensure you're logged in
- Check that the Supabase session is valid

**"Name mismatch" error:**
- Verify that the user's `first_name` and `last_name` in their profile match the name on their bank account
- The comparison is case-insensitive but requires exact match

**Plaid Link not opening:**
- Check browser console for errors
- Verify `link_token` was created successfully
- Ensure `react-plaid-link` is installed

