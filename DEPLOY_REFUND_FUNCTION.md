# Deploy Refund Edge Function

## Option 1: Deploy via Supabase CLI (Recommended)

### Step 1: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. After login, you'll be able to deploy functions.

### Step 2: Link Your Project (if not already linked)

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL:
- `https://YOUR_PROJECT_REF.supabase.co`

Or list your projects:
```bash
supabase projects list
```

### Step 3: Deploy the Function

```bash
supabase functions deploy process-refund --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function uses service role key internally.

### Step 4: Set Environment Variables

After deployment, set the required environment variables in Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Find `process-refund` function
3. Click **Manage secrets**
4. Add these secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Project Settings → API)
   - `REFUND_PROVIDER` - (Optional) Set to `stripe`, `plaid_transfer`, or `dwolla` when ready

**OR** set them via CLI:

```bash
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set REFUND_PROVIDER=NOT_CONFIGURED
```

---

## Option 2: Deploy via Supabase Dashboard

### Step 1: Go to Edge Functions

1. Open your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**

### Step 2: Create Function

1. **Function name**: `process-refund`
2. **Copy the code** from `supabase/functions/process-refund/index.ts`
3. Paste it into the editor
4. Click **Deploy**

### Step 3: Set Environment Variables

1. Go to **Project Settings** → **Edge Functions**
2. Find `process-refund` function
3. Click **Manage secrets**
4. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REFUND_PROVIDER` (optional)

---

## Verify Deployment

### Test the Function

You can test the function via the Supabase Dashboard:

1. Go to **Edge Functions** → `process-refund`
2. Click **Invoke**
3. Use this test payload:
```json
{
  "order_id": "your-test-order-id"
}
```

### Check Logs

View function logs in the dashboard:
- **Edge Functions** → `process-refund` → **Logs**

Or via CLI:
```bash
supabase functions logs process-refund
```

---

## Troubleshooting

### "Access token not provided"
```bash
supabase login
```

### "Bundle generation timed out"
- The function might be too large or there's a network issue
- Try deploying via dashboard instead
- Check function size (should be < 1MB)

### "SUPABASE_SERVICE_ROLE_KEY must be set"
- Make sure you've set the environment variable/secret
- Check Project Settings → API → service_role key

### Function not found after deployment
- Wait a few seconds for deployment to complete
- Refresh the dashboard
- Check function name matches exactly: `process-refund`

---

## Next Steps After Deployment

1. ✅ Function deployed
2. ✅ Environment variables set
3. ⏳ Test with a cancelled order
4. ⏳ Implement refund provider (Stripe/Plaid/Dwolla)
5. ⏳ Monitor logs for any errors

---

## Quick Deploy Command (Once Logged In)

```bash
# Login (one time)
supabase login

# Link project (one time, if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy process-refund --no-verify-jwt

# Set secrets
supabase secrets set SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

