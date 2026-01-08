# ⚠️ URGENT: Function Still Using Old Code

## Problem

The deployed function is still crashing with:
```
SyntaxError: Unexpected end of JSON input
at source/index.ts:5:20
```

This means the **old code** (without `safeJson()`) is still deployed.

## Solution: Force Redeploy

### Step 1: Delete the Old Function

1. Go to: https://supabase.com/dashboard/project/uqpcyqcpnhjkpyyjlmqr/functions
2. Find `process-refund` function
3. **Delete it** (or click "Edit" then "Delete")

### Step 2: Create Fresh Function

1. Click **"Create a new function"**
2. Name: `process-refund`
3. **Copy the ENTIRE file** from `supabase/functions/process-refund/index.ts`
4. **Paste into editor**
5. **Click "Deploy"**

### Step 3: Verify Deployment

After deploying, check the function code in the dashboard:
- Look for `safeJson()` function (should be around line 33-46)
- Look for `const body = await safeJson(req);` (should be around line 177)
- **Should NOT see** `await req.json()` anywhere

### Step 4: Test Again

Cancel an order and check logs. You should now see:
```
[Refund] Raw URL: ...
[Refund] Request method: POST
[Refund] Parsed body: { order_id: "..." }
```

**NOT** the JSON parsing error.

---

## Why This Happened

The deployment might have:
- Cached the old version
- Not picked up the new code
- Had a deployment error that wasn't visible

Deleting and recreating ensures a clean deployment.

---

## Quick Verification

After redeploying, the function should have:

✅ `safeJson()` function defined (lines 33-46)  
✅ `const body = await safeJson(req);` (line 177)  
✅ Query string fallback: `body.order_id ?? new URL(req.url).searchParams.get("order_id")`  
✅ Enhanced logging for debugging  

❌ **NO** `await req.json()` anywhere

