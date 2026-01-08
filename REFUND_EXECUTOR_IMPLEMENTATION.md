# Refund Executor Implementation

## Overview

This document describes the server-side refund executor that processes refunds when orders are cancelled. The system ensures refunds go back to the bank account that funded the original order (pinned bank), with automatic fallback to the primary account if the pinned bank is unavailable.

## Architecture

### Flow

1. **Client calls `cancelOrder()`** → Updates order status to "Cancelled" via FSM
2. **`cancelOrder()` invokes Edge Function** → `process-refund` (fire-and-forget)
3. **Edge Function processes refund**:
   - Loads order and determines refund destination
   - Creates/updates `refund_jobs` row (idempotency)
   - Calls refund provider (stub for now)
   - Updates job status with result

### Key Design Decisions

- **Server-side only**: Refund processing happens in Edge Function, not client
- **Idempotent**: One refund job per order (enforced by `UNIQUE(order_id)`)
- **Provider-agnostic**: Stub implementation ready for Stripe/Plaid/Dwolla
- **Audit trail**: All refund attempts logged in `refund_jobs` table
- **Non-blocking**: Refund processing doesn't block order cancellation UI

## Database Schema

### `refund_jobs` Table

```sql
CREATE TABLE public.refund_jobs (
  id uuid PRIMARY KEY,
  order_id uuid UNIQUE,              -- Idempotency key
  customer_id uuid,
  amount_cents integer,              -- Refund amount (orders.total_payment * 100)
  status text,                        -- queued | processing | succeeded | failed
  destination_bank_account_id uuid,  -- Where refund was sent
  fallback_reason text,               -- NULL or 'PINNED_UNAVAILABLE'
  provider text,                      -- stripe | plaid_transfer | dwolla
  provider_ref text,                  -- External transaction ID
  error text,                         -- Error message if failed
  created_at timestamptz,
  updated_at timestamptz
);
```

**RLS Policy**: Service role only (no public/authenticated access for security)

## Refund Routing Logic

The Edge Function implements the exact routing rules:

```typescript
// 1. Try pinned bank (orders.bank_account_id)
const pinnedBank = await loadBankAccount(order.bank_account_id);

// 2. Fallback to primary ONLY if pinned unavailable
if (!pinnedBank || !pinnedBank.plaid_item_id) {
  const primaryBank = await loadPrimaryBank(order.customer_id);
  fallbackReason = 'PINNED_UNAVAILABLE';
}

// 3. Error if no destination found
if (!destination) throw new Error('NO_REFUND_DESTINATION');
```

**Rules**:
- ✅ Refund to `orders.bank_account_id` (pinned at order creation)
- ✅ Fallback to primary only if pinned is disconnected/missing
- ✅ Primary changes don't affect past orders
- ✅ All routing decisions logged in `refund_jobs.fallback_reason`

## Refund Amount

**Column**: `orders.total_payment`

This is the full amount paid by the customer (requested_amount + total_service_fee). This is what gets refunded.

**Calculation in Edge Function**:
```typescript
const amountCents = Math.round(Number(order.total_payment) * 100);
```

## Edge Function: `process-refund`

**Location**: `supabase/functions/process-refund/index.ts`

**Input**:
```json
{
  "order_id": "uuid"
}
```

**Steps**:
1. Load order (id, customer_id, bank_account_id, total_payment, status)
2. Validate order is refundable (status = "Cancelled")
3. Check idempotency (existing refund_jobs row)
4. Determine refund destination (pinned → primary fallback)
5. Upsert refund_jobs row (status = "processing")
6. Call refund provider (stub for now)
7. Update job status (succeeded/failed)

**Output**:
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "succeeded",
  "provider_ref": "external_tx_id",
  "amount_cents": 12345,
  "destination_bank_account_id": "uuid",
  "fallback_reason": null
}
```

## Integration with `cancelOrder`

**Location**: `src/db/api.ts:1998-2020`

After successful order cancellation:

```typescript
// Invoke refund processing (fire and forget)
supabase.functions.invoke('process-refund', {
  body: { order_id: orderId }
}).then(({ data, error }) => {
  if (error) {
    console.error("[cancelOrder] Error invoking refund function:", error);
  } else {
    console.log("[cancelOrder] ✅ Refund processing initiated:", data);
  }
}).catch((err) => {
  console.error("[cancelOrder] Exception invoking refund function:", err);
});
```

**Note**: Refund processing is non-blocking. UI doesn't wait for refund to complete.

## Provider Implementation (Stub)

The Edge Function includes a stub `issueRefund()` function that currently returns:

```typescript
{
  success: false,
  providerRef: null,
  error: "REFUND_PROVIDER_NOT_CONFIGURED"
}
```

**To implement a provider**:

1. Set environment variable: `REFUND_PROVIDER=stripe` (or `plaid_transfer`, `dwolla`)
2. Implement provider-specific logic in `issueRefund()` function
3. Return `{ success: true, providerRef: "tx_123", error: null }` on success

**Example for Stripe**:
```typescript
case "stripe":
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
    amount: params.amountCents
  });
  return {
    success: true,
    providerRef: refund.id,
    error: null
  };
```

## Idempotency

The `refund_jobs` table enforces idempotency:

- **Unique constraint** on `order_id` ensures only one refund job per order
- **Upsert logic** in Edge Function: if job exists and `status = "succeeded"`, return early
- **Retry logic**: If job exists with `status = "failed"`, retry the refund

## Testing Checklist

- [ ] Order cancelled → refund job created in `refund_jobs`
- [ ] Refund goes to pinned bank account (orders.bank_account_id)
- [ ] Pinned bank disconnected → refund falls back to primary
- [ ] Primary changed after order creation → refund still goes to original pinned bank
- [ ] Multiple cancellation attempts → only one refund job (idempotent)
- [ ] Refund amount = orders.total_payment
- [ ] Audit trail in `refund_jobs` table
- [ ] Edge Function logs show routing decisions

## Migration

**File**: `supabase/migrations/20250107_create_refund_jobs_table.sql`

Run this migration to create the `refund_jobs` table.

## Environment Variables

Required for Edge Function:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for RLS bypass)
- `REFUND_PROVIDER` - Provider name (optional, defaults to "NOT_CONFIGURED")

## Next Steps

1. **Choose refund provider**: Stripe, Plaid Transfer, or Dwolla
2. **Implement provider logic**: Replace stub in `issueRefund()`
3. **Add webhook handler**: For provider callbacks (optional)
4. **Add retry logic**: For failed refunds (optional)
5. **Add notifications**: Notify customer when refund completes

## Files Created

1. `supabase/migrations/20250107_create_refund_jobs_table.sql` - Database schema
2. `supabase/functions/process-refund/index.ts` - Edge Function
3. `src/db/api.ts` (updated) - Invokes Edge Function on cancellation

## Security

- **RLS enabled**: Only service_role can access `refund_jobs`
- **Service role key**: Edge Function uses service role to bypass RLS
- **No public access**: Refund processing is server-side only
- **Audit trail**: All refund attempts logged with full details

