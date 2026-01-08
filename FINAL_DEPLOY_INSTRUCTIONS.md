# Final Deploy Instructions - With Enhanced Error Handling

## The Issue

The error `SyntaxError: Unexpected end of JSON input` at `source/index.ts:5:20` suggests the error happens very early, possibly before our handler runs or in Supabase's runtime.

## Solution: Enhanced Defensive Code

The function now has:
1. ✅ Triple-wrapped error handling (safeJson + try-catch in handler + outer try-catch)
2. ✅ Body null checks before reading
3. ✅ Empty string checks
4. ✅ Query string fallback for order_id
5. ✅ Enhanced logging to debug what's happening

## Deploy Steps

1. **Delete the old function** (if it exists)
2. **Create new function** with name `process-refund`
3. **Copy entire file** from `supabase/functions/process-refund/index.ts`
4. **Paste and deploy**

## After Deployment - Test

Cancel an order and check logs. You should see:
```
[Refund] Raw URL: ...
[Refund] Request method: POST
[Refund] Request headers: {...}
[Refund] Empty request body text, returning empty object  (if body is empty)
OR
[Refund] Successfully parsed JSON body  (if body exists)
[Refund] Parsed body: { order_id: "..." }
```

## If Still Failing

If you still see the JSON parsing error, it means:
- The error is happening in Supabase's runtime before our code runs
- OR the body is being consumed/parsed by middleware

**Next step**: Check if `supabase.functions.invoke()` is actually sending the body. Add this to `cancelOrder`:

```typescript
console.log("[cancelOrder] Invoking refund with:", { order_id: orderId });
const result = await supabase.functions.invoke('process-refund', {
  body: { order_id: orderId }
});
console.log("[cancelOrder] Invoke result:", result);
```

This will confirm if the body is being sent correctly.

