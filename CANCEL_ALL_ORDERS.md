# Cancel All Live Orders

This guide explains how to cancel all live/active orders in the system.

## What are "Live Orders"?

Live orders are orders that are **not** in a final state:
- ✅ Not `Completed`
- ✅ Not `Cancelled`

These include orders with statuses like:
- `Pending`
- `Runner Accepted`
- `Runner at ATM`
- `Cash Withdrawn`
- `Pending Handoff`

## Methods to Cancel All Live Orders

### Method 1: Browser Console (Easiest)

1. **Log in as admin** in your browser
2. **Navigate to any admin page** (e.g., `/admin/dashboard`)
3. **Open browser console** (F12 or Cmd+Option+I)
4. **Copy and paste this code:**

```javascript
// Import the cancelAllLiveOrders function
import { cancelAllLiveOrders } from '/src/db/api.ts';

// Run it
cancelAllLiveOrders().then(result => {
  console.log('Result:', result);
  if (result.success) {
    console.log(`✅ Cancelled ${result.cancelled} orders`);
    if (result.failed > 0) {
      console.log(`❌ Failed: ${result.failed}`);
      console.log('Errors:', result.errors);
    }
  } else {
    console.error('Failed:', result.errors);
  }
});
```

**Note:** If the above doesn't work due to module import issues, use Method 2.

### Method 2: Direct API Call in Browser Console

1. **Log in as admin**
2. **Open browser console on any admin page**
3. **Copy and paste this code:**

```javascript
(async () => {
  // Access Supabase from the app (if available on window)
  // Or use the Supabase client from the page context
  
  // Get orders
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Not authenticated');
    return;
  }

  // Get live orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status')
    .not('status', 'in', '(Completed,Cancelled)');

  if (!orders || orders.length === 0) {
    console.log('No live orders found');
    return;
  }

  console.log(`Found ${orders.length} live orders. Cancelling...`);

  let cancelled = 0;
  let failed = 0;

  for (const order of orders) {
    const { error } = await supabase.rpc('rpc_advance_order', {
      p_order_id: order.id,
      p_next_status: 'Cancelled',
      p_metadata: {
        reason: 'Bulk cancellation by admin',
        cancelled_by: user.id
      }
    });

    if (error) {
      console.error(`Failed ${order.id.slice(0, 8)}:`, error.message);
      failed++;
    } else {
      console.log(`✅ Cancelled ${order.id.slice(0, 8)}`);
      cancelled++;
    }
  }

  console.log(`\n✅ Cancelled ${cancelled}/${orders.length} orders`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
})();
```

### Method 3: Admin UI (One by One)

1. Go to **Admin → Order Monitoring** (`/admin/orders`)
2. Filter by status to see live orders
3. Click on each order to open detail page
4. Click "Cancel Order" button
5. Repeat for each order

### Method 4: Node.js Script

Run the provided script:

```bash
npx tsx scripts/cancel-all-live-orders.ts
```

**Note:** This requires Node.js and proper environment variables set up.

## Safety Notes

⚠️ **Warning:** This action is **irreversible**. Cancelled orders cannot be restored.

- All cancellations are logged in the audit trail
- The FSM (Finite State Machine) ensures proper state transitions
- Each cancellation includes a reason: "Bulk cancellation by admin"
- The admin user ID is recorded for each cancellation

## What Happens When Orders Are Cancelled?

1. Order status changes to `Cancelled`
2. `cancelled_at` timestamp is set
3. `cancelled_by` is set to the admin user ID
4. `cancellation_reason` is set to "Bulk cancellation by admin"
5. An audit log entry is created
6. An order event is recorded in the `order_events` table
7. Real-time subscribers are notified of the status change

## Troubleshooting

### "Not authenticated" error
- Make sure you're logged in as an admin
- Check that your session is still valid

### "Unauthorized" error
- Verify your user has the `admin` role
- Check the `profiles` table: `role` should include `'admin'`

### Some orders fail to cancel
- Check the error messages in the console
- Some orders may have constraints that prevent cancellation
- The FSM validates state transitions - if an order is in an invalid state, it may fail

### Script doesn't work in browser console
- Make sure you're on a page that has Supabase initialized
- Try refreshing the page and running the script again
- Check browser console for any error messages









