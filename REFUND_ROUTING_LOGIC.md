# Refund Routing Logic - Implementation Guide

## Overview

This document defines the refund routing rules for Benjamin. Refunds must always go back to the bank account that funded the original order, not the current primary account.

## Core Rules

### Rule A: Order-Linked Refunds
**Refunds go back to the bank account tied to the order.**

- Source of truth: `orders.bank_account_id`
- This is "frozen" at order creation time
- Primary account changes do NOT affect past orders

### Rule B: Primary as Default + Fallback
**Primary account serves two purposes:**

1. **Default**: When creating a new order, if user doesn't explicitly pick an account, use primary
2. **Fallback**: If the original bank account is disconnected/unavailable at refund time, use current primary

### Rule C: Primary Changes Don't Affect Past Orders
**Once an order is created, its refund destination is locked.**

- `orders.bank_account_id` is set at order creation
- Changing primary account does NOT change refund destination for existing orders
- This ensures financial accuracy and regulatory compliance

## Implementation

### Order Creation Flow

```typescript
// In createOrder() function (src/db/api.ts)

// 1. User selects bank account in UI (or defaults to primary)
const bankAccountId = selectedBankAccountId || primaryBankAccountId;

// 2. Validate bank account belongs to user
const isValid = userBankAccounts.some(ba => ba.id === bankAccountId);

// 3. Store on order at creation time
const order = await createOrder({
  // ... other fields ...
  bank_account_id: bankAccountId, // ← Frozen at creation
});
```

### Refund Flow

```typescript
// Pseudo-code for refund logic

async function processRefund(orderId: string, refundAmount: number) {
  // 1. Get the order
  const order = await getOrderById(orderId);
  
  // 2. Get the bank account used for this order (source of truth)
  let refundBankAccountId = order.bank_account_id;
  
  // 3. Check if original bank account still exists and is active
  const originalBankAccount = await getBankAccountById(refundBankAccountId);
  
  if (!originalBankAccount || originalBankAccount.is_disconnected) {
    // 4. Fallback: Use current primary account
    const userBankAccounts = await getBankAccounts();
    const primaryBank = userBankAccounts.find(ba => ba.is_primary);
    
    if (!primaryBank) {
      throw new Error('Cannot process refund: No primary bank account available');
    }
    
    refundBankAccountId = primaryBank.id;
    
    // 5. Log the fallback for audit trail
    console.log('[REFUND] Original bank account unavailable, using primary:', {
      orderId,
      originalBankAccountId: order.bank_account_id,
      fallbackBankAccountId: refundBankAccountId,
      reason: originalBankAccount ? 'disconnected' : 'not_found'
    });
    
    // 6. Optionally notify user
    await sendNotification(userId, {
      type: 'refund_fallback',
      message: 'Original bank was removed. Refund sent to your primary account.',
      orderId,
      originalBank: originalBankAccount?.bank_institution_name,
      refundBank: primaryBank.bank_institution_name
    });
  }
  
  // 7. Process refund to the determined account
  const refundResult = await processRefundToBank({
    bankAccountId: refundBankAccountId,
    amount: refundAmount,
    orderId: order.id
  });
  
  // 8. Log refund for audit trail
  await logRefund({
    orderId: order.id,
    refundBankAccountId,
    originalBankAccountId: order.bank_account_id,
    amount: refundAmount,
    usedFallback: refundBankAccountId !== order.bank_account_id,
    timestamp: new Date().toISOString()
  });
  
  return refundResult;
}
```

## Edge Cases

### 1. Original Bank Account Disconnected

**Scenario**: User disconnects the bank account that was used for an order, then requests a refund.

**Solution**:
- Check if `order.bank_account_id` still exists and is active
- If not, fallback to current primary account
- Log the fallback for audit trail
- Notify user: "Original bank was removed. Refund sent to your primary account."

### 2. No Primary Account Exists

**Scenario**: User has no primary account (shouldn't happen due to UI constraints).

**Solution**:
- Block disconnecting the last primary account (already implemented)
- Server-side guard: Require primary account before allowing refunds
- Error message: "Cannot process refund: No primary bank account available"

### 3. Multiple Refunds for Same Order

**Scenario**: Partial refunds or multiple refund transactions.

**Solution**:
- All refunds for the same order use the same `order.bank_account_id`
- Even if primary changes between refunds, use original account
- Only fallback to primary if original account is unavailable

## Database Schema

### Orders Table
```sql
ALTER TABLE public.orders
  ADD COLUMN bank_account_id uuid REFERENCES bank_accounts(id);

CREATE INDEX idx_orders_bank_account_id 
  ON public.orders(bank_account_id);
```

### Bank Accounts Table
```sql
-- Ensure only one primary per user
CREATE UNIQUE INDEX bank_accounts_one_primary_per_user_idx
  ON public.bank_accounts(user_id)
  WHERE is_primary = true;
```

## Validation

### Order Creation Validation
- ✅ `bank_account_id` must belong to the user creating the order
- ✅ If not provided, default to primary account
- ✅ If no primary exists, require explicit selection

### Refund Validation
- ✅ `order.bank_account_id` is the source of truth
- ✅ Validate original account exists before using it
- ✅ Fallback to primary only if original is unavailable
- ✅ Log all refund routing decisions for audit

## Testing Checklist

- [ ] Order created with selected bank account → refund goes to that account
- [ ] Order created with default primary → refund goes to that primary (even if primary changes later)
- [ ] Original bank disconnected → refund falls back to current primary
- [ ] Primary changed after order creation → refund still goes to original account
- [ ] Multiple refunds for same order → all use original account
- [ ] No primary account available → refund blocked with clear error
- [ ] Audit logs capture all refund routing decisions

## Migration Notes

1. **Existing Orders**: Orders created before this migration will have `bank_account_id = NULL`
   - For these orders, refunds should use current primary account
   - Consider backfilling if you have historical data

2. **Backward Compatibility**: 
   - Code should handle `bank_account_id = NULL` gracefully
   - Always fallback to primary in this case

3. **Rollout**:
   - Deploy migration first
   - Deploy code changes
   - Monitor refund processing for any issues

