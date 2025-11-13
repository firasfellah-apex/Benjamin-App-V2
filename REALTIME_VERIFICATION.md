# Realtime Verification Guide

## Issue: No Events Received

If you see `[Realtime] ✅ Subscribed to...` but no events are received when orders are created/updated, follow these steps:

## Step 1: Verify Realtime is Enabled in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the `orders` table in the list
4. **Toggle Realtime to ON** ✅

**This is the most common cause of no events!**

## Step 2: Verify Migration Was Applied

Run this SQL in your Supabase SQL Editor:

```sql
-- Check if orders table is in realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'orders';

-- Check replica identity
SELECT relreplident 
FROM pg_class 
WHERE relname = 'orders';
-- Should return 'f' (FULL)
```

If the first query returns no rows, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

## Step 3: Test Realtime Connection

Open browser console and look for:

```
[Realtime] ✅ Subscribed to runner-available-orders
[Realtime] runner-available-orders - Listening for events on orders table...
```

If you see this but NO events when creating an order, Realtime is not enabled in the dashboard.

## Step 4: Check Console Logs

When you create an order, you should see:

```
[Realtime] runner-available-orders - Raw payload received: { ... }
[Realtime] runner-available-orders - Event received: { eventType: 'INSERT', ... }
[AvailableOrders] Realtime INSERT received: { orderId: '...', ... }
```

If you DON'T see these logs, Realtime is not enabled.

## Step 5: Verify RLS Policies

Make sure your RLS policies allow users to SELECT orders:

```sql
-- Check RLS policies for orders table
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

Runners should be able to SELECT orders with `status = 'Pending' AND runner_id IS NULL`.

## Quick Fix

If nothing works, try this in Supabase SQL Editor:

```sql
-- Remove and re-add to publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Ensure replica identity is FULL
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

Then **enable Realtime in the dashboard** (Database → Replication → orders table → toggle ON).









