# 🔧 CORS Fix for Plaid Edge Function

## The Problem

When calling the Plaid Edge Function from the frontend, you got this error:

```
Access to fetch at 'https://uqpcyqcpnhjkpyyjlmqr.supabase.co/functions/v1/plaid' 
from origin 'http://localhost:5174' has been blocked by CORS policy: 
Request header field apikey is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

**Root Cause**: The Edge Function's CORS headers didn't include `apikey` in the allowed headers list. When `supabase.functions.invoke()` makes a request, it includes the `apikey` header, but the Edge Function wasn't allowing it.

## The Fix

### ✅ Updated CORS Headers

**Before:**
```typescript
"Access-Control-Allow-Headers": "authorization, content-type"
```

**After:**
```typescript
"Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info"
```

### ✅ Created CORS Helper Function

Added a helper function to ensure all responses include proper CORS headers:

```typescript
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  };
}
```

### ✅ Updated All Response Headers

All responses now use `getCorsHeaders()` to ensure consistent CORS headers:
- OPTIONS preflight responses
- Success responses (200)
- Error responses (400, 401, 404, 500)

## What Changed

**File**: `supabase/functions/plaid/index.ts`

1. ✅ Added `getCorsHeaders()` helper function
2. ✅ Updated OPTIONS handler to include `apikey` and `x-client-info` headers
3. ✅ Updated all response headers to use `getCorsHeaders()`

## Next Steps

### 1. Deploy the Edge Function

```bash
supabase functions deploy plaid
```

Or if using Supabase Dashboard, the function should auto-deploy on save.

### 2. Test the Flow

1. **Open app** and navigate to bank connection
2. **Click "Connect Bank"**
3. **Check console** - should no longer see CORS errors
4. **Complete Plaid Link flow**
5. **Verify** bank account is created

### 3. Expected Behavior

**Before Fix:**
- ❌ CORS error in console
- ❌ Edge Function never called
- ❌ No logs in Supabase Dashboard

**After Fix:**
- ✅ No CORS errors
- ✅ Edge Function called successfully
- ✅ Logs appear in Supabase Dashboard
- ✅ Bank account created in database

## Verification

After deploying, test the flow and check:

1. **Frontend Console**:
   - Should see `[Plaid] 🔗 Calling Edge Function: plaid/create-link-token`
   - Should see `[Plaid] ✅ Link token received: ...`
   - No CORS errors

2. **Supabase Dashboard → Edge Functions → plaid → Logs**:
   - Should see request logs
   - Should see `[Plaid Edge Function] Request path: create-link-token`
   - Should see successful responses

3. **Database**:
   ```sql
   SELECT * FROM bank_accounts ORDER BY created_at DESC LIMIT 5;
   ```
   - Should see new bank account rows

## Why This Happened

When using `supabase.functions.invoke()`, Supabase automatically adds:
- `Authorization` header (with Bearer token)
- `apikey` header (with anon key)
- `x-client-info` header (client metadata)

The Edge Function needs to explicitly allow these headers in its CORS configuration, otherwise the browser blocks the request during the preflight OPTIONS check.

## Summary

✅ **Fixed**: Added `apikey` and `x-client-info` to CORS allowed headers
✅ **Fixed**: Created helper function for consistent CORS headers
✅ **Fixed**: Updated all responses to use proper CORS headers
✅ **Result**: Edge Function can now be called from frontend without CORS errors!

---

**Next**: Deploy the function and test. The CORS error should be gone! 🚀

