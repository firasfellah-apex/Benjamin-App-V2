# Deploy Edge Function to Fix Bank Institution Data

## Issue
The database shows `bank_institution_name` and `bank_institution_logo_url` as `null` for all profiles. This means the Edge Function is not fetching/storing institution data.

## Solution: Deploy the Updated Edge Function

### Step 1: Deploy the Edge Function

```bash
# Make sure you're in the project root
cd /Users/firasfellah/Downloads/Benjamin-App

# Deploy the plaid Edge Function
supabase functions deploy plaid
```

### Step 2: Verify Deployment

After deployment, check that the function is updated:
1. Go to Supabase Dashboard → Edge Functions → plaid
2. Check the "Last updated" timestamp
3. It should show the current time

### Step 3: Test by Reconnecting Bank

1. **Disconnect your bank account:**
   - Go to "My Bank Accounts" page
   - Click "Disconnect Bank"
   - Confirm

2. **Reconnect your bank account:**
   - Click "Connect Bank with Plaid"
   - Complete the Plaid flow

3. **Check Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → plaid → Logs
   - Look for these log messages:
     - `[Plaid] Item and Auth data:` - Should show `institution_id`
     - `[Plaid] Fetching institution details for institution_id:` - Should show the ID
     - `[Plaid] Institution data fetched successfully:` - Should show name and logo
     - `[Plaid] Updating profile with institution data:` - Should show the data being saved

### Step 4: Verify Database

After reconnecting, run this query:

```sql
SELECT 
  id,
  email,
  bank_institution_name,
  bank_institution_logo_url,
  updated_at
FROM profiles
WHERE plaid_item_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

You should now see:
- `bank_institution_name`: "Chase", "Bank of America", etc.
- `bank_institution_logo_url`: `data:image/png;base64,...`

## Troubleshooting

### If institution_id is null in logs:
- This means Plaid didn't return an institution_id
- Check if you're using the correct Plaid environment (sandbox vs production)
- Some test banks in sandbox might not have institution_id

### If Plaid API call fails:
- Check Plaid credentials in Edge Function environment variables
- Verify `PLAID_CLIENT_ID` and `PLAID_SECRET` are set correctly
- Check Plaid dashboard for API errors

### If update succeeds but data is still null:
- Check if the migration was applied correctly
- Verify columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'bank_institution%';`

## Expected Log Output

After successful deployment and reconnection, you should see:

```
[Plaid] Item and Auth data: {
  accounts_count: 1,
  item_id: "...",
  institution_id: "ins_123456"  // ← Should NOT be null
}

[Plaid] Fetching institution details for institution_id: ins_123456

[Plaid] Institution data fetched successfully: {
  name: "Chase",  // ← Should have a value
  has_logo: true,
  logo_url_length: 12345
}

[Plaid] Updating profile with institution data: {
  has_name: true,  // ← Should be true
  has_logo: true,  // ← Should be true
  name: "Chase",
  updateData_keys: ["kyc_status", "kyc_verified_at", "plaid_item_id", "bank_institution_name", "bank_institution_logo_url", "updated_at"]
}
```

