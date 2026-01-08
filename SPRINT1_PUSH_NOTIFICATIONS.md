# Sprint 1: Event-Driven Delivery + Push Notifications

## ✅ What's Been Set Up

### 1. Database Schema
- ✅ `order_events` table extended with `event_type` and `payload` columns
- ✅ `user_push_tokens` table extended with `is_active` and `last_seen_at` fields
- ✅ Indexes added for efficient queries

### 2. Edge Function
- ✅ `notify-order-event` function created (stub for FCM/APNs)
- ✅ Notification templates defined (Benjamin tone)
- ✅ CORS and error handling implemented

### 3. Client Helpers
- ✅ `src/db/events.ts` - Event emission helpers
- ✅ `src/lib/pushNotifications.ts` - Token registration (already exists)

## 📋 Next Steps

### Step 1: Run Migrations

```bash
# Apply the new migrations
supabase migration up
```

Or apply manually in Supabase Dashboard → SQL Editor:
1. `20250107_add_event_driven_to_order_events.sql`
2. `20250107_add_device_fields_to_push_tokens.sql`

### Step 2: Deploy Edge Function

```bash
# Deploy the notify-order-event function
supabase functions deploy notify-order-event --no-verify-jwt
```

Or copy/paste `supabase/functions/notify-order-event/index.ts` into Supabase Dashboard → Edge Functions.

### Step 3: Wire Events into Your App

#### Example: When Runner Accepts Order

```typescript
// In your runner accept order function
import { emitRunnerAssigned } from '@/db/events';

async function acceptOrder(orderId: string, runnerId: string, runnerName: string) {
  // ... existing accept logic ...
  
  // Emit event (triggers push notification)
  await emitRunnerAssigned(orderId, runnerId, runnerName);
}
```

#### Example: When Runner Arrives

```typescript
import { emitRunnerArrived } from '@/db/events';

async function markArrived(orderId: string) {
  // ... existing logic ...
  
  await emitRunnerArrived(orderId);
}
```

#### Example: When Order is Cancelled

```typescript
import { emitOrderCancelled } from '@/db/events';

async function cancelOrder(orderId: string, cancelledBy: 'customer' | 'runner' | 'admin') {
  // ... existing cancel logic ...
  
  await emitOrderCancelled(orderId, cancelledBy);
}
```

#### Example: Wire Refund Events

In `supabase/functions/process-refund/index.ts`, add event emissions:

```typescript
import { emitRefundProcessing, emitRefundSucceeded, emitRefundFailed } from '@/db/events';

// After creating refund job:
await emitRefundProcessing(order.id, refundJob.id);

// After refund succeeds:
await emitRefundSucceeded(order.id, refundJob.id, refundResult.providerRef);

// After refund fails:
await emitRefundFailed(order.id, refundJob.id, refundResult.error);
```

### Step 4: Implement FCM/APNs in Edge Function

The `sendPushNotification` function in `notify-order-event/index.ts` is currently a stub.

**For FCM (Android):**
```typescript
async function sendPushNotification(params: {
  token: string;
  platform: 'ios' | 'android' | 'web';
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  if (params.platform === 'android') {
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${fcmServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.token,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: params.data,
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: await response.text() };
    }
    return { success: true };
  }
  
  // TODO: Implement APNs for iOS
  return { success: false, error: "iOS not implemented yet" };
}
```

**For APNs (iOS):**
- Use `@apns/apns2` or similar library
- Requires APNs key/certificate
- Send to `https://api.push.apple.com/3/device/{token}`

### Step 5: Handle Deep Links

When user taps notification, deep link to order:

```typescript
// In your app routing
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (data) => {
  // Handle deep link: benjamin://order/{order_id}
  const url = new URL(data.url);
  if (url.hostname === 'order') {
    const orderId = url.pathname.replace('/', '');
    navigate(`/orders/${orderId}`);
  }
});
```

### Step 6: Real-time Updates (Optional)

Use Supabase Realtime to update UI instantly:

```typescript
import { supabase } from '@/db/supabase';

// Subscribe to order events
const channel = supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'order_events',
    filter: `order_id=eq.${orderId}`
  }, (payload) => {
    // Update UI based on event
    const event = payload.new;
    if (event.event_type === 'runner_arrived') {
      setStatus('Runner Arrived');
    }
  })
  .subscribe();
```

## 🎯 Event Types & Payloads

| Event Type | Payload | When to Emit |
|------------|---------|--------------|
| `order_created` | `{}` | When order is created |
| `runner_assigned` | `{ runner_id, runner_name? }` | When runner accepts order |
| `runner_en_route` | `{ eta_seconds? }` | When runner starts heading to customer |
| `runner_arrived` | `{ arrived_at }` | When runner marks "arrived" |
| `otp_verified` | `{ verified_at }` | When customer verifies OTP |
| `handoff_completed` | `{ completed_at }` | When delivery is complete |
| `order_cancelled` | `{ cancelled_by }` | When order is cancelled |
| `refund_processing` | `{ refund_job_id }` | When refund job is created |
| `refund_succeeded` | `{ refund_job_id, provider_ref? }` | When refund succeeds |
| `refund_failed` | `{ refund_job_id, error }` | When refund fails |

## 🔒 Security Notes

1. **Edge Function JWT**: Currently `--no-verify-jwt` for dev. Enable JWT verification in production.
2. **RLS**: `order_events` RLS policies ensure users only see their own events.
3. **Token Storage**: `user_push_tokens` RLS ensures users only manage their own tokens.

## 🧪 Testing

1. **Test Event Emission**:
   ```typescript
   import { emitOrderCreated } from '@/db/events';
   await emitOrderCreated('test-order-id');
   ```

2. **Check Database**:
   ```sql
   SELECT * FROM order_events 
   WHERE order_id = 'test-order-id' 
   ORDER BY created_at DESC;
   ```

3. **Check Edge Function Logs**:
   - Supabase Dashboard → Edge Functions → `notify-order-event` → Logs
   - Should see notification attempts

4. **Test Push Token Registration**:
   - App should auto-register tokens on login
   - Check `user_push_tokens` table

## 📝 Notes

- **Option A (Current)**: Explicit event emission from app code
- **Option B (Future)**: DB trigger on `order_events` INSERT → auto-trigger Edge Function
- Push notifications are "fire and forget" - failures don't block order flow
- Events are append-only and immutable
- Client renders from latest state (Supabase Realtime or polling)

