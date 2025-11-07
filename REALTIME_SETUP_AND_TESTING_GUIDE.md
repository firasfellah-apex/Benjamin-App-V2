# Realtime Setup and Testing Guide

## Overview

This guide explains how to enable and test instant realtime updates for the Benjamin Cash Delivery Service. After following these steps, all order status changes will appear instantly across Customer, Runner, and Admin views without page refreshes.

---

## What Was Fixed

### Database Level ✅
1. **Replica Identity**: Set to FULL for the `orders` table
2. **Realtime Publication**: Added `orders` table to `supabase_realtime` publication

### Frontend Level ✅
1. **Enhanced Logging**: Added console logging to track subscription status
2. **Error Handling**: Added error detection for failed subscriptions
3. **Proper Cleanup**: All subscriptions properly unsubscribe on unmount

---

## Step 1: Apply Database Migration

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /workspace/app-7dlmcs8ryyv5

# Apply the migration
supabase db push

# Or if using remote database
supabase db push --db-url "your-database-url"
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20251107_enable_realtime_for_orders.sql`
4. Click **Run**

### Option C: Manual SQL Execution

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable full replica identity
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

---

## Step 2: Enable Realtime in Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the `orders` table in the list
4. Toggle **Realtime** to **ON**

![Realtime Toggle](https://supabase.com/docs/img/realtime-toggle.png)

---

## Step 3: Verify RLS Policies

Ensure your Row Level Security policies allow users to SELECT the rows they need to see:

### For Runners
```sql
-- Runners can see Pending orders and their own accepted orders
CREATE POLICY "runners_can_view_relevant_orders"
ON orders FOR SELECT TO authenticated
USING (
  status = 'Pending' OR runner_id = auth.uid()
);
```

### For Customers
```sql
-- Customers can see their own orders
CREATE POLICY "customers_can_view_own_orders"
ON orders FOR SELECT TO authenticated
USING (customer_id = auth.uid());
```

### For Admins
```sql
-- Admins can see all orders
CREATE POLICY "admins_can_view_all_orders"
ON orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.role)
  )
);
```

**Important:** Realtime respects RLS policies. If a user can't SELECT a row, they won't receive realtime events for it.

---

## Step 4: Test Realtime Functionality

### Test 1: Runner Sees New Orders Instantly

**Setup:**
1. Open two browser windows side-by-side
2. Window 1: Log in as a **Customer** → Navigate to "Request Cash"
3. Window 2: Log in as a **Runner** → Navigate to "Available Orders"

**Test Steps:**
1. In Window 1 (Customer): Create a new cash request
2. Watch Window 2 (Runner): The new order should appear **instantly** without refreshing

**Expected Console Output (Runner window):**
```
[Realtime] Orders subscription status: SUBSCRIBED
[Realtime] Orders change detected: INSERT { id: "...", status: "Pending", ... }
```

**If it doesn't work:**
- Check browser console for errors
- Look for `CHANNEL_ERROR` or `TIMED_OUT` messages
- Verify the migration was applied successfully

---

### Test 2: Customer Sees Status Updates Instantly

**Setup:**
1. Open two browser windows side-by-side
2. Window 1: Log in as a **Customer** → Create an order → Navigate to order tracking page
3. Window 2: Log in as a **Runner** → Navigate to "Available Orders"

**Test Steps:**
1. In Window 2 (Runner): Accept the order
2. Watch Window 1 (Customer): Status should change to "Runner Accepted" **instantly**
3. In Window 2 (Runner): Update status to "Runner at ATM"
4. Watch Window 1 (Customer): Status should update **instantly**

**Expected Console Output (Customer window):**
```
[Realtime] Order abc123 subscription status: SUBSCRIBED
[Realtime] Order abc123 change detected: UPDATE { status: "Runner Accepted", ... }
[Realtime] Order abc123 change detected: UPDATE { status: "Runner at ATM", ... }
```

---

### Test 3: Admin Sees All Updates Instantly

**Setup:**
1. Open three browser windows
2. Window 1: Log in as **Customer** → Order tracking page
3. Window 2: Log in as **Runner** → Order detail page
4. Window 3: Log in as **Admin** → Order monitoring page

**Test Steps:**
1. In Window 2 (Runner): Update order status
2. Watch Window 1 (Customer): Should see update instantly
3. Watch Window 3 (Admin): Should see update instantly

**Expected Console Output (Admin window):**
```
[Realtime] Orders subscription status: SUBSCRIBED
[Realtime] Orders change detected: UPDATE { status: "...", ... }
```

---

## Step 5: Debugging Realtime Issues

### Check Subscription Status

Open browser console and look for these messages:

**✅ Good:**
```
[Realtime] Orders subscription status: SUBSCRIBED
```

**❌ Bad:**
```
[Realtime] Orders subscription status: CHANNEL_ERROR
[Realtime] Orders subscription failed: CHANNEL_ERROR
```

**❌ Bad:**
```
[Realtime] Orders subscription status: TIMED_OUT
[Realtime] Orders subscription failed: TIMED_OUT
```

### Common Issues and Solutions

#### Issue 1: CHANNEL_ERROR

**Cause:** Realtime not enabled for the table

**Solution:**
1. Verify migration was applied: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
2. Check Supabase Dashboard → Database → Replication → Enable for `orders`
3. Restart your Supabase project (if self-hosted)

#### Issue 2: TIMED_OUT

**Cause:** Network issues or Supabase service problems

**Solution:**
1. Check your internet connection
2. Verify Supabase project is running
3. Check Supabase status page: https://status.supabase.com
4. Try refreshing the page

#### Issue 3: SUBSCRIBED but No Events

**Cause:** RLS policies blocking SELECT access

**Solution:**
1. Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
   ```
2. If events start working, your RLS policies are too restrictive
3. Re-enable RLS and adjust policies:
   ```sql
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ```

#### Issue 4: Events Received but UI Not Updating

**Cause:** Frontend not calling the callback or not refreshing data

**Solution:**
1. Check console logs - are events being received?
2. Verify the callback function is being called
3. Ensure `loadOrders()` or `loadOrder()` is being called in the callback
4. Check for JavaScript errors in console

---

## Step 6: Verify Configuration

### Check Replica Identity

```sql
SELECT schemaname, tablename, relreplident
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE relname = 'orders';
```

**Expected Result:**
- `relreplident` should be `f` (FULL)

### Check Publication

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'orders';
```

**Expected Result:**
- Should return one row showing `orders` table is in the publication

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders';
```

**Expected Result:**
- Should show policies for SELECT that allow appropriate access

---

## Step 7: Performance Monitoring

### Monitor Realtime Connections

In Supabase Dashboard:
1. Navigate to **Database** → **Replication**
2. Check **Active Connections** count
3. Monitor for any errors or warnings

### Monitor Database Load

```sql
-- Check active realtime connections
SELECT count(*) FROM pg_stat_activity
WHERE application_name LIKE '%realtime%';

-- Check replication lag (should be near 0)
SELECT pg_current_wal_lsn() - sent_lsn AS replication_lag
FROM pg_stat_replication;
```

---

## Step 8: Production Checklist

Before deploying to production:

- [ ] Migration applied successfully
- [ ] Realtime enabled in dashboard
- [ ] RLS policies tested and verified
- [ ] All three user types tested (Customer, Runner, Admin)
- [ ] Console logs show SUBSCRIBED status
- [ ] Events received and UI updates instantly
- [ ] No CHANNEL_ERROR or TIMED_OUT errors
- [ ] Performance acceptable (no lag)
- [ ] Multiple concurrent users tested
- [ ] Network interruption recovery tested

---

## Advanced: Realtime Event Types

### INSERT Events

Triggered when a new order is created.

**Payload:**
```javascript
{
  eventType: "INSERT",
  new: { id: "...", status: "Pending", ... },
  old: null,
  schema: "public",
  table: "orders"
}
```

**Use Case:** Runner's Available Orders page shows new orders instantly

### UPDATE Events

Triggered when an order is modified.

**Payload:**
```javascript
{
  eventType: "UPDATE",
  new: { id: "...", status: "Runner Accepted", ... },
  old: { id: "...", status: "Pending", ... },
  schema: "public",
  table: "orders"
}
```

**Use Case:** Customer sees status updates, Runner sees assignment

### DELETE Events

Triggered when an order is deleted (rare in this app).

**Payload:**
```javascript
{
  eventType: "DELETE",
  new: null,
  old: { id: "...", status: "Cancelled", ... },
  schema: "public",
  table: "orders"
}
```

**Use Case:** Remove cancelled orders from lists

---

## Troubleshooting Flowchart

```
Is realtime working?
├─ No → Check console for subscription status
│   ├─ CHANNEL_ERROR → Check migration applied + dashboard enabled
│   ├─ TIMED_OUT → Check network + Supabase status
│   └─ SUBSCRIBED but no events → Check RLS policies
│
└─ Yes, but UI not updating
    ├─ Check console for event logs
    ├─ Verify callback is called
    └─ Ensure data refresh function is called
```

---

## Support and Resources

### Documentation
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Common Commands

```bash
# Check Supabase CLI version
supabase --version

# Check database status
supabase db status

# View realtime logs (if self-hosted)
docker logs supabase-realtime

# Reset local database (development only)
supabase db reset
```

### Getting Help

If you're still experiencing issues:

1. Check Supabase status: https://status.supabase.com
2. Review Supabase logs in dashboard
3. Check browser console for detailed error messages
4. Verify environment variables are set correctly
5. Test with a fresh browser session (clear cache)

---

## Appendix: Code Examples

### Example: Custom Subscription Handler

```typescript
// Advanced subscription with filtering
export function subscribeToOrdersByStatus(
  status: OrderStatus,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`orders:status:${status}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `status=eq.${status}`
      },
      (payload) => {
        console.log(`[Realtime] Order with status ${status}:`, payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Status subscription:`, status);
    });

  return channel;
}
```

### Example: Optimistic UI Updates

```typescript
// Update UI immediately, then sync with server
const handleAcceptOrder = async (orderId: string) => {
  // Optimistic update
  setOrders(prev => prev.map(order =>
    order.id === orderId
      ? { ...order, status: "Runner Accepted" }
      : order
  ));

  // Server update
  const success = await acceptOrder(orderId);

  if (!success) {
    // Revert on failure
    loadOrders();
    toast.error("Failed to accept order");
  }
};
```

### Example: Reconnection Logic

```typescript
// Handle reconnection after network interruption
useEffect(() => {
  let channel: RealtimeChannel;
  let reconnectTimer: NodeJS.Timeout;

  const subscribe = () => {
    channel = subscribeToOrders((payload) => {
      loadOrders();
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // Retry after 5 seconds
        reconnectTimer = setTimeout(() => {
          console.log("[Realtime] Attempting to reconnect...");
          channel.unsubscribe();
          subscribe();
        }, 5000);
      }
    });
  };

  subscribe();

  return () => {
    clearTimeout(reconnectTimer);
    channel?.unsubscribe();
  };
}, []);
```

---

**Document Version:** 1.0  
**Date:** 2025-11-07  
**Status:** Ready for Implementation  
**Author:** AI Assistant (Miaoda)
