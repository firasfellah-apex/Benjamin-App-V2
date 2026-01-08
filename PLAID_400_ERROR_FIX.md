# 🔧 Plaid Edge Function 400 Error Fix

## The Problem

When exchanging the public token, the Edge Function returned a 400 Bad Request error:

```
POST https://uqpcyqcpnhjkpyyjlmqr.supabase.co/functions/v1/plaid 400 (Bad Request)
Edge Function returned a non-2xx status code
```

**Root Cause**: The Edge Function was trying to read the request body multiple times. When using `supabase.functions.invoke()`, the request body can only be read once. The routing logic was:
1. Reading body to determine path (if path is "plaid")
2. Reading body again in the exchange route handler
3. Second read fails because body stream is already consumed

## The Fix

### ✅ Fixed Body Reading Logic

**Before:**
- Read body in routing check
- Read body again in route handler
- ❌ Second read fails

**After:**
- Read body once at the top if path is "plaid"
- Store in `requestBody` variable
- Reuse stored body in route handlers
- ✅ Body only read once

### Code Changes

**File**: `supabase/functions/plaid/index.ts`

1. **Read body once at the top**:
   ```typescript
   let requestBody: any = null;
   if (path === "plaid" || !path) {
     try {
       requestBody = await req.json();
       path = requestBody.path || path;
     } catch (e) {
       // Handle error
     }
   }
   ```

2. **Reuse stored body in exchange route**:
   ```typescript
   if (path === "exchange-public-token" && req.method === "POST") {
     // Use the body we already parsed, or parse it if we haven't yet
     let body: any = requestBody;
     if (!body) {
       body = await req.json(); // Only if not already read
     }
     // ... use body
   }
   ```

3. **Simplified routing**:
   - Removed duplicate body reading logic
   - Cleaner path-based routing
   - Better error handling

## Next Steps

### 1. Deploy the Edge Function

```bash
supabase functions deploy plaid
```

### 2. Test the Flow

1. **Open app** and navigate to bank connection
2. **Click "Connect Bank"**
3. **Complete Plaid Link flow**
4. **Check console** - should see success logs
5. **Verify** bank account is created

### 3. Expected Behavior

**Before Fix:**
- ❌ 400 Bad Request error
- ❌ "Edge Function returned a non-2xx status code"
- ❌ No bank account created

**After Fix:**
- ✅ Exchange successful
- ✅ Bank account created in database
- ✅ Success message shown to user

## Debugging

If you still see errors, check:

1. **Edge Function Logs** (Supabase Dashboard):
   - Look for `[Plaid Edge Function] Request path: exchange-public-token`
   - Look for `[Plaid Edge Function] Exchange request body: ...`
   - Check for any error messages

2. **Frontend Console**:
   - Look for `[Plaid] 🔄 Calling Edge Function: plaid/exchange-public-token`
   - Look for `[Plaid] ✅ Exchange successful: ...`
   - Check for error details

3. **Request Body**:
   - Verify `public_token` is being sent
   - Verify `path: 'exchange-public-token'` is in body
   - Check Edge Function logs for body contents

## Common Issues

### Issue: "Invalid JSON body"

**Cause**: Body was already consumed or malformed

**Fix**: The new code reads body once and reuses it, so this should be resolved.

### Issue: "Missing public_token"

**Cause**: `public_token` not in request body

**Check**: Verify frontend is sending `public_token` in the body:
```typescript
body: { 
  path: 'exchange-public-token',
  public_token: publicToken,
  // ...
}
```

### Issue: Still getting 400

**Check Edge Function logs** for the exact error message. The function now logs:
- Request path
- Request body contents
- Any validation errors

## Summary

✅ **Fixed**: Body reading logic - now reads once and reuses
✅ **Fixed**: Simplified routing - cleaner path-based routing
✅ **Fixed**: Better error handling - more detailed error messages
✅ **Result**: Exchange should now work without 400 errors!

---

**Next**: Deploy the function and test. The 400 error should be resolved! 🚀

