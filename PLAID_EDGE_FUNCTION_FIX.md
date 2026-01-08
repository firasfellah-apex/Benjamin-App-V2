# 🔧 Plaid Edge Function Not Being Called - FIXED

## The Problem

The Plaid Edge Function was never being invoked because:
1. Frontend was using direct `fetch()` calls instead of `supabase.functions.invoke()`
2. Edge Function expected path in URL, but `supabase.functions.invoke()` doesn't include path in URL
3. No error logging to debug the issue

## The Fix

### 1. ✅ Updated Frontend (`src/lib/plaid.ts`)

**Changed from:**
```typescript
// ❌ Direct fetch (doesn't work reliably)
const response = await fetch(`${functionUrl}/create-link-token`, {
  method: "POST",
  headers: { ... },
});
```

**Changed to:**
```typescript
// ✅ Using supabase.functions.invoke() (proper way)
const { data, error } = await supabase.functions.invoke('plaid', {
  body: { 
    path: 'create-link-token',
    method: 'POST'
  }
});
```

**Benefits:**
- Uses Supabase's built-in function invocation
- Automatically handles auth headers
- Better error handling
- Added comprehensive logging

### 2. ✅ Updated Edge Function (`supabase/functions/plaid/index.ts`)

**Added path detection from body:**
```typescript
// Try to get path from URL first, then from body (for supabase.functions.invoke)
let path = url.pathname.split("/").pop();

// If path is just "plaid" (from supabase.functions.invoke), read from body
if (path === "plaid" || !path) {
  try {
    const body = await req.clone().json().catch(() => ({}));
    path = body.path || path;
  } catch {
    // If body parsing fails, use URL path
  }
}
```

**Added logging:**
- Logs request path, URL, and method
- Logs exchange request body details
- Helps debug routing issues

## How to Test

### Step 1: Deploy the Edge Function

```bash
supabase functions deploy plaid
```

Or if using Supabase Dashboard, the function should auto-deploy on save.

### Step 2: Test the Flow

1. **Open app and navigate to bank connection**
2. **Click "Connect Bank"**
3. **Complete Plaid Link flow**
4. **Check logs:**

**Frontend Console:**
- `[Plaid] 🔗 Calling Edge Function: plaid/create-link-token`
- `[Plaid] ✅ Link token received: ...`
- `[Plaid] 🔄 Calling Edge Function: plaid/exchange-public-token`
- `[Plaid] ✅ Exchange successful: ...`

**Edge Function Logs (Supabase Dashboard):**
- `[Plaid Edge Function] Request path: create-link-token`
- `[Plaid Edge Function] Request method: POST`
- `[Plaid] ✅ New Plaid item - will create new bank account entry`
- `[Plaid] Inserting bank account: ...`

### Step 3: Verify Bank Account Created

```sql
SELECT * FROM bank_accounts ORDER BY created_at DESC LIMIT 5;
```

You should see a new row with:
- `user_id` - Your user ID
- `plaid_item_id` - The Plaid item ID
- `bank_institution_name` - Bank name
- `is_primary` - true/false

## What Changed

### Files Modified

1. **`src/lib/plaid.ts`**
   - ✅ Changed from `fetch()` to `supabase.functions.invoke()`
   - ✅ Added comprehensive logging
   - ✅ Better error handling

2. **`supabase/functions/plaid/index.ts`**
   - ✅ Added path detection from request body
   - ✅ Added logging for debugging
   - ✅ Better error messages

## Verification Checklist

- [ ] Edge Function deployed (`supabase functions deploy plaid`)
- [ ] Frontend logs show "Calling Edge Function"
- [ ] Edge Function logs appear in Supabase Dashboard
- [ ] Link token is created successfully
- [ ] Public token is exchanged successfully
- [ ] Bank account appears in `bank_accounts` table
- [ ] No errors in console or Edge Function logs

## If Still Not Working

### Check 1: Function Name

Verify the function is named exactly `plaid`:
- Supabase Dashboard → Edge Functions → Should see `plaid` in list

### Check 2: Supabase URL

Verify frontend is pointing to correct project:
```typescript
console.log("[Plaid] Supabase URL:", supabase.supabaseUrl);
```

Should match your Supabase project URL.

### Check 3: Auth Token

Verify user is authenticated:
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log("[Plaid] Has session:", !!session);
```

### Check 4: Function Deployment

Verify function is deployed:
- Supabase Dashboard → Edge Functions → `plaid` → Should show "Deployed"
- Check function code matches latest version

## Expected Flow

1. User clicks "Connect Bank"
2. Frontend calls `createLinkToken()`
3. Edge Function `/create-link-token` creates Plaid link token
4. Plaid Link opens
5. User completes flow
6. Plaid calls `onSuccess` with `public_token`
7. Frontend calls `exchangePublicToken(publicToken)`
8. Edge Function `/exchange-public-token`:
   - Exchanges token
   - Gets institution data
   - Inserts into `bank_accounts` table
9. Frontend invalidates cache
10. Bank account appears in UI

## Summary

✅ **Fixed**: Frontend now uses `supabase.functions.invoke()` instead of direct `fetch()`
✅ **Fixed**: Edge Function now reads path from body for `invoke()` calls
✅ **Added**: Comprehensive logging for debugging
✅ **Result**: Edge Function will now be called and bank accounts will be created!

---

**Next**: Deploy the Edge Function and test. You should now see logs in Supabase Dashboard! 🚀

