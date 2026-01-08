# Deploy process-refund Function - Quick Steps

## Option 1: Via Supabase Dashboard (Easiest - No CLI needed)

1. **Go to**: https://supabase.com/dashboard/project/uqpcyqcpnhjkpyyjlmqr/functions
2. **Click**: "Create a new function" (or edit existing `process-refund` if it exists)
3. **Function name**: `process-refund`
4. **Copy the entire file**: `supabase/functions/process-refund/index.ts`
5. **Paste into the editor**
6. **Click "Deploy"**

That's it! The function will be deployed with the safe JSON parsing fix.

---

## Option 2: Via CLI (If you're logged in)

```bash
# Make sure you're logged in
supabase login

# Deploy
supabase functions deploy process-refund --no-verify-jwt
```

---

## After Deployment

Set environment variables in Dashboard:
1. Go to **Project Settings** → **Edge Functions** → `process-refund` → **Manage secrets**
2. Add:
   - `SUPABASE_URL` = Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = From Project Settings → API
   - `REFUND_PROVIDER` = `NOT_CONFIGURED` (for now)

---

## Test It

After deploying, cancel an order and check the Edge Function logs:
- **Edge Functions** → `process-refund` → **Logs**

You should see:
```
[Refund] Raw URL: ...
[Refund] Request method: POST
[Refund] Parsed body: { order_id: "..." }
```

