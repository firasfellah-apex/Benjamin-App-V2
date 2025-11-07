# 🎯 Finite State Machine (FSM) Implementation Guide

## ✅ What Was Implemented

Your Benjamin Cash Delivery Service now has a **production-ready Finite State Machine** for order status management with:

1. ✅ **Type-Safe Status Transitions** - Enum-based status with validation
2. ✅ **Transition Allowlist** - Only valid state changes are permitted
3. ✅ **SECURITY DEFINER RPC** - All status changes go through validated function
4. ✅ **Audit Trail** - Complete history of all status changes
5. ✅ **Idempotency** - Prevents double-click bugs
6. ✅ **Performance Indexes** - Optimized database queries
7. ✅ **Role-Based Validation** - Enforces business rules at database level
8. ✅ **Environment Validation** - Zod-based env variable validation

---

## 🔄 Valid State Transitions

```
Pending
  ↓
Runner Accepted (runner accepts job)
  ↓
Runner at ATM (runner arrives at ATM)
  ↓
Cash Withdrawn (runner withdraws cash)
  ↓
Pending Handoff (OTP generated)
  ↓
Completed (OTP verified, delivery complete)

Cancellation Paths:
- Pending → Cancelled (customer cancels before runner at ATM)
- Runner Accepted → Cancelled (customer/admin cancels)
```

**Illegal Transitions (Now Blocked):**
- ❌ Pending → Completed (skipping steps)
- ❌ Runner at ATM → Pending (going backwards)
- ❌ Completed → any status (final state)
- ❌ Any other non-listed transition

---

## 📚 New API Functions

### 1. `advanceOrderStatus()` - Main FSM Function

**Purpose:** Safely advance order status with validation and audit trail

**Usage:**
```typescript
import { advanceOrderStatus } from '@/db/api';

// Generate idempotency key once per action
const actionId = crypto.randomUUID();

try {
  const updatedOrder = await advanceOrderStatus(
    orderId,
    'Runner Accepted',
    actionId,  // Optional but recommended
    { note: 'Accepted via mobile app' }  // Optional metadata
  );
  
  console.log('Order updated:', updatedOrder);
} catch (error) {
  // Handle errors (illegal transition, permission denied, etc.)
  console.error('Failed to update order:', error.message);
  toast.error(error.message);
}
```

**Benefits:**
- ✅ Validates transition is legal
- ✅ Enforces role-based permissions
- ✅ Prevents double-clicks (idempotency)
- ✅ Records audit trail automatically
- ✅ Returns updated order object

---

### 2. `getOrderHistory()` - Audit Trail

**Purpose:** Get complete history of all status changes for an order

**Usage:**
```typescript
import { getOrderHistory } from '@/db/api';

const history = await getOrderHistory(orderId);

// Display in UI
history.forEach(event => {
  console.log(`${event.actor_name} changed status from ${event.from_status} to ${event.to_status} at ${event.created_at}`);
});
```

**Returns:**
```typescript
[
  {
    event_id: 'uuid',
    from_status: 'Pending',
    to_status: 'Runner Accepted',
    actor_id: 'uuid',
    actor_role: 'runner',
    actor_name: 'John Doe',
    metadata: { note: 'Accepted via mobile app' },
    created_at: '2025-11-07T10:30:00Z'
  },
  // ... more events
]
```

---

### 3. `isValidTransition()` - UI Helper

**Purpose:** Check if a transition is valid (useful for showing/hiding buttons)

**Usage:**
```typescript
import { isValidTransition } from '@/db/api';

const canCancel = await isValidTransition(currentStatus, 'Cancelled');

// Show/hide cancel button
{canCancel && (
  <Button onClick={handleCancel}>Cancel Order</Button>
)}
```

---

### 4. `getValidNextStatuses()` - Dynamic UI

**Purpose:** Get all valid next statuses for current order status

**Usage:**
```typescript
import { getValidNextStatuses } from '@/db/api';

const validStatuses = await getValidNextStatuses('Pending');
// Returns: ['Runner Accepted', 'Cancelled']

// Render action buttons dynamically
validStatuses.map(status => (
  <Button key={status} onClick={() => handleStatusChange(status)}>
    {status}
  </Button>
))
```

---

## 🔧 Migration from Old Code

### Before (Unsafe):
```typescript
// ❌ OLD CODE - No validation, allows illegal transitions
await updateOrderStatus(orderId, 'Completed');  // Could skip steps!
```

### After (Safe):
```typescript
// ✅ NEW CODE - Validated, idempotent, audited
const actionId = crypto.randomUUID();
await advanceOrderStatus(orderId, 'Completed', actionId);
// Throws error if transition is illegal
```

---

## 🎨 Frontend Integration Examples

### Example 1: Runner Accepts Order

```typescript
// components/runner/AvailableOrders.tsx
import { advanceOrderStatus } from '@/db/api';
import { useState } from 'react';
import { toast } from 'sonner';

function AcceptOrderButton({ orderId }: { orderId: string }) {
  const [isAccepting, setIsAccepting] = useState(false);
  
  const handleAccept = async () => {
    setIsAccepting(true);
    const actionId = crypto.randomUUID();
    
    try {
      await advanceOrderStatus(
        orderId,
        'Runner Accepted',
        actionId,
        { acceptedAt: new Date().toISOString() }
      );
      
      toast.success('Order accepted successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAccepting(false);
    }
  };
  
  return (
    <Button 
      onClick={handleAccept} 
      disabled={isAccepting}
      aria-busy={isAccepting}
    >
      {isAccepting ? 'Accepting...' : 'Accept Order'}
    </Button>
  );
}
```

---

### Example 2: Customer Cancels Order

```typescript
// components/customer/OrderTracking.tsx
import { advanceOrderStatus, isValidTransition } from '@/db/api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function CancelOrderButton({ order }: { order: Order }) {
  const [canCancel, setCanCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  useEffect(() => {
    // Check if cancellation is valid for current status
    isValidTransition(order.status, 'Cancelled').then(setCanCancel);
  }, [order.status]);
  
  const handleCancel = async () => {
    setIsCancelling(true);
    const actionId = crypto.randomUUID();
    
    try {
      await advanceOrderStatus(
        order.id,
        'Cancelled',
        actionId,
        { reason: 'Customer requested cancellation' }
      );
      
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCancelling(false);
    }
  };
  
  if (!canCancel) return null;
  
  return (
    <Button 
      variant="destructive"
      onClick={handleCancel} 
      disabled={isCancelling}
    >
      {isCancelling ? 'Cancelling...' : 'Cancel Order'}
    </Button>
  );
}
```

---

### Example 3: Admin Views Order History

```typescript
// components/admin/OrderHistoryModal.tsx
import { getOrderHistory } from '@/db/api';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function OrderHistoryModal({ orderId, open, onClose }: Props) {
  const [history, setHistory] = useState<OrderEventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (open && orderId) {
      setLoading(true);
      getOrderHistory(orderId)
        .then(setHistory)
        .finally(() => setLoading(false));
    }
  }, [orderId, open]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order History</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {history.map(event => (
              <div key={event.event_id} className="border-l-2 border-primary pl-4">
                <div className="font-medium">
                  {event.from_status} → {event.to_status}
                </div>
                <div className="text-sm text-muted-foreground">
                  By {event.actor_name} ({event.actor_role})
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="text-xs mt-1">
                    {JSON.stringify(event.metadata, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔒 Security Features

### Role-Based Validation

The FSM enforces these rules at the database level:

1. **Runners:**
   - ✅ Can accept Pending orders (status → Runner Accepted)
   - ✅ Can update their assigned orders (Runner at ATM, Cash Withdrawn, Pending Handoff)
   - ❌ Cannot cancel orders
   - ❌ Cannot update orders assigned to other runners

2. **Customers:**
   - ✅ Can cancel their own orders (before Runner at ATM)
   - ❌ Cannot update order status otherwise
   - ❌ Cannot cancel other customers' orders

3. **Admins:**
   - ✅ Can cancel any order
   - ✅ Can view all order history
   - ⚠️ Should use admin-specific RPCs for status changes (future enhancement)

---

## 🐛 Error Handling

### Common Errors and Solutions

#### Error: "Illegal transition: Pending → Completed"
**Cause:** Trying to skip steps in the workflow  
**Solution:** Follow the correct sequence of status changes

#### Error: "Only runners can accept orders"
**Cause:** Customer or admin trying to accept an order  
**Solution:** Ensure only runners call advanceOrderStatus with 'Runner Accepted'

#### Error: "Only the assigned runner can update this order"
**Cause:** Different runner trying to update another runner's order  
**Solution:** Check runner_id matches current user before allowing updates

#### Error: "Runners cannot cancel orders"
**Cause:** Runner trying to cancel an order  
**Solution:** Only customers and admins can cancel orders

---

## 📊 Database Schema

### order_status_transitions Table
```sql
from_status | to_status        | description
------------|------------------|----------------------------------
Pending     | Runner Accepted  | Runner accepts the delivery job
Runner Accepted | Runner at ATM | Runner arrives at ATM location
Runner at ATM | Cash Withdrawn | Runner withdraws cash from ATM
Cash Withdrawn | Pending Handoff | OTP generated, ready for handoff
Pending Handoff | Completed | OTP verified, delivery completed
Pending     | Cancelled        | Customer cancels before runner at ATM
Runner Accepted | Cancelled | Order cancelled after acceptance
```

### order_events Table (Audit Trail)
```sql
id               | uuid (PK)
order_id         | uuid (FK → orders.id)
from_status      | order_status
to_status        | order_status
actor_id         | uuid (FK → profiles.id)
actor_role       | user_role
client_action_id | text (idempotency key)
metadata         | jsonb
created_at       | timestamptz
```

**Unique Constraint:** `(order_id, client_action_id)` - Prevents duplicate transitions

---

## 🚀 Performance Optimizations

### Indexes Created

1. **orders_status_created_idx** - Fast queries by status and date
2. **orders_runner_idx** - Fast runner order lookups
3. **orders_customer_idx** - Fast customer order lookups
4. **orders_pending_idx** - Optimized for "Available Orders" page
5. **orders_cancelled_idx** - Fast cancelled order queries
6. **order_events_order_id_idx** - Fast order history lookups
7. **order_events_client_action_id_idx** - Fast idempotency checks

---

## ✅ Testing Checklist

### Unit Tests (Recommended)

```typescript
describe('advanceOrderStatus', () => {
  it('should allow valid transitions', async () => {
    const order = await advanceOrderStatus(orderId, 'Runner Accepted');
    expect(order.status).toBe('Runner Accepted');
  });
  
  it('should reject illegal transitions', async () => {
    await expect(
      advanceOrderStatus(orderId, 'Completed')  // Skip steps
    ).rejects.toThrow('Illegal transition');
  });
  
  it('should be idempotent', async () => {
    const actionId = crypto.randomUUID();
    const order1 = await advanceOrderStatus(orderId, 'Runner Accepted', actionId);
    const order2 = await advanceOrderStatus(orderId, 'Runner Accepted', actionId);
    expect(order1.id).toBe(order2.id);
  });
});
```

### Manual Testing

1. ✅ **Happy Path:** Create order → Runner accepts → Runner at ATM → Cash withdrawn → Pending handoff → Completed
2. ✅ **Cancellation:** Create order → Cancel (should work)
3. ✅ **Illegal Transition:** Try to skip steps (should fail with error)
4. ✅ **Double Click:** Click "Accept" twice rapidly (should only accept once)
5. ✅ **Wrong Role:** Customer tries to accept order (should fail)
6. ✅ **Audit Trail:** View order history (should show all transitions)

---

## 📝 Next Steps

### Immediate Actions

1. **Update All Status Changes** - Replace all `updateOrderStatus()` calls with `advanceOrderStatus()`
2. **Add Error Handling** - Wrap all status changes in try-catch blocks
3. **Show Order History** - Add "View History" button in admin panel
4. **Optimistic UI** - Show loading states during status transitions

### Future Enhancements

1. **Notifications** - Trigger push notifications on status changes
2. **Webhooks** - Call external APIs on specific transitions
3. **Time Limits** - Add automatic cancellation after timeout
4. **Analytics** - Track average time in each status
5. **Admin Override** - Special RPC for admins to force status changes (with audit trail)

---

## 🆘 Troubleshooting

### Issue: "updateOrderStatus is deprecated" warning

**Solution:** Replace with `advanceOrderStatus`:
```typescript
// Before
await updateOrderStatus(orderId, 'Completed');

// After
await advanceOrderStatus(orderId, 'Completed', crypto.randomUUID());
```

### Issue: Realtime updates not working after FSM

**Solution:** Realtime subscriptions still work! The FSM uses the same `orders` table, so all realtime events fire normally.

### Issue: Need to force a status change (emergency)

**Solution:** Use Supabase SQL Editor to manually update (not recommended):
```sql
-- Emergency only - bypasses FSM validation
UPDATE orders SET status = 'Cancelled' WHERE id = 'order-uuid';
```

---

## 📚 Additional Resources

- **Migration Files:**
  - `supabase/migrations/20251107_implement_order_fsm.sql`
  - `supabase/migrations/20251107_implement_order_fsm_rpcs.sql`
  - `supabase/migrations/20251107_implement_order_fsm_helpers.sql`

- **Type Definitions:** `src/types/types.ts`
- **API Functions:** `src/db/api.ts`
- **Environment Validation:** `src/lib/env.ts`

---

## 🎉 Summary

Your order status management is now **production-ready** with:

- ✅ **No more illegal transitions** - Database enforces valid state changes
- ✅ **No more double-click bugs** - Idempotency prevents duplicates
- ✅ **Complete audit trail** - Know who changed what and when
- ✅ **Role-based security** - Business rules enforced at database level
- ✅ **Performance optimized** - Indexes for fast queries
- ✅ **Type-safe** - TypeScript + Zod validation

**Next:** Update your frontend code to use the new `advanceOrderStatus()` function! 🚀
