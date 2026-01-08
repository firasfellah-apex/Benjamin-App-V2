# Bank Account Refund Data Model

## Business Logic

### Primary Account Purpose
The "Primary" bank account is the **default account for non-order-specific money movements**, not the account used for every transaction.

**Primary serves as:**
- Default suggested account for the next order
- Identity verification & KYC anchor
- Security checks
- Account-level refunds (not tied to a specific order)
- Fallback refunds (edge cases)
- Future features: credits, subscription fees, wallet-like balance payouts

### Two Money Flow Paths

#### 1️⃣ Order-Linked Money Flows (Transaction-Specific)
**These must always go back to the same bank that was used for that order.**

Examples:
- Refund for a canceled order
- Partial refund
- Adjustment due to ATM short-dispense
- Failed delivery reversal

**Rule:** Money always returns to the bank account that funded the order.

Example:
- User pays from Truist for Order #123
- User later changes primary to Wells Fargo
- Refund for Order #123 must still credit Truist (the original funding source)

#### 2️⃣ Account-Level Money Flows (Not Tied to a Specific Order)
**This is where Primary actually matters.**

Examples:
- Identity verification & KYC anchor
- Security checks
- Dispute resolutions not tied to one order
- Fallback refunds (edge cases)
- Future: auto-refunds, credits, subscription fees, failed charge reversals, wallet-like balance payouts

**Rule:** When there is no specific order bank to target, we use the Primary bank.

### Backend Rule (Canonical Logic)

```typescript
if (refund.isLinkedToOrder) {
  refund.to = order.bank_account_id
} else {
  refund.to = user.primary_bank_account_id
}
```

---

## Required Data Model Changes

### 1. Add `bank_account_id` to Orders Table

```sql
-- Migration: Add bank_account_id to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_orders_bank_account_id 
  ON public.orders(bank_account_id);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.bank_account_id IS 
  'The bank account used to fund this order. Refunds must go back to this account, not the current primary.';
```

### 2. Create Payments Table (Recommended)

If you want to separate payment attempts from orders:

```sql
-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id) NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Processor IDs (Plaid/Stripe/etc)
  transfer_id text,
  payment_id text,
  reversal_id text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  refunded_at timestamptz
);

-- Indexes
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_bank_account_id ON public.payments(bank_account_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.customer_id = auth.uid()
    )
  );
```

### 3. Update Order TypeScript Interface

```typescript
// src/types/types.ts
export interface Order {
  // ... existing fields ...
  bank_account_id: string | null; // Add this
}
```

---

## Refund Flow Implementation

### Step-by-Step Process

1. **Look up the order/payment**
   ```typescript
   const order = await getOrderById(orderId);
   const bankAccountId = order.bank_account_id;
   ```

2. **Read bank_account_id used**
   ```typescript
   if (!bankAccountId) {
     throw new Error('Order has no associated bank account');
   }
   
   const bankAccount = await getBankAccountById(bankAccountId);
   ```

3. **Initiate refund/reversal to that funding source**
   ```typescript
   // Use Plaid API to reverse transfer to the original bank_account_id
   const refund = await reverseTransfer({
     bankAccountId: bankAccountId,
     amount: order.total_payment,
     originalTransferId: order.transfer_id
   });
   ```

4. **Mark refunded + store refund reference**
   ```typescript
   await supabase
     .from('orders')
     .update({
       refunded_at: new Date().toISOString(),
       reversal_id: refund.reversal_id,
       status: 'Refunded'
     })
     .eq('id', orderId);
   ```

---

## UI Behavior Changes

### Checkout/Request Cash Screen

Show which bank will be used with ability to change:

```
Paying from: Truist •••• 1234 [Change]
```

- Primary account preselects as default
- If user switches banks, that `bank_account_id` is stored on the order
- This becomes the refund destination, regardless of future primary changes

### Implementation Example

```typescript
// In checkout component
const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(
  bankAccounts.find(ba => ba.is_primary)?.id || bankAccounts[0]?.id || null
);

// When creating order
const order = await createOrder({
  // ... other fields ...
  bank_account_id: selectedBankAccountId, // Store at payment time
});
```

---

## Edge Cases

### 1. Bank Account Disconnected Later

**Decision**: Keep `bank_account_id` on historical orders, but block disconnect if there are pending refunds.

```sql
-- Check before allowing disconnect
SELECT COUNT(*) 
FROM orders 
WHERE bank_account_id = $1 
  AND status NOT IN ('Completed', 'Refunded', 'Cancelled')
  AND refunded_at IS NULL;
```

**Options**:
- **Option A**: Block disconnect if pending refunds exist
- **Option B**: Allow disconnect, but mark account as inactive (keep record for historical orders)
- **Option C**: Force refund all pending orders before disconnect

### 2. Partial Refunds

Still tied to the same `bank_account_id`, just multiple refund rows:

```sql
-- Multiple refund records for same order
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id) NOT NULL,
  amount numeric NOT NULL,
  reversal_id text,
  created_at timestamptz DEFAULT now()
);
```

---

## Migration Checklist

- [ ] Add `bank_account_id` column to `orders` table
- [ ] Create `payments` table (optional, but recommended)
- [ ] Update TypeScript `Order` interface
- [ ] Update order creation flow to store `bank_account_id`
- [ ] Update checkout UI to show selected bank with "Change" option
- [ ] Update refund flow to use stored `bank_account_id`
- [ ] Add validation to prevent disconnecting bank with pending refunds
- [ ] Update order history to show which bank was used
- [ ] Test refund flow with multiple bank accounts

---

## Notes

- **Primary account is just a UI convenience** - it doesn't affect refunds
- **Refunds are tied to the funding source at payment time**, not current primary
- **Historical accuracy is critical** - never change `bank_account_id` on existing orders

