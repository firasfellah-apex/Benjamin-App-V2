# Admin Order Cancellation - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN USER                                │
│                     (Authenticated)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND UI LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AdminOrderDetail.tsx                                     │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  1. Display "Cancel Order" button                  │  │   │
│  │  │     (Only for Pending orders)                      │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  2. Show AlertDialog on button click               │  │   │
│  │  │     - Cancellation reason dropdown                 │  │   │
│  │  │     - Custom reason text field (if "Other")        │  │   │
│  │  │     - Confirm/Cancel buttons                       │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  3. Validate form inputs                           │  │   │
│  │  │     - Reason selected?                             │  │   │
│  │  │     - Custom reason provided (if needed)?          │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  4. Call cancelOrder() API                         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  5. Show toast notification                        │  │   │
│  │  │     - Success: "Order cancelled successfully"      │  │   │
│  │  │     - Error: Display error message                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  6. Refresh order data                             │  │   │
│  │  │     - Update UI to show cancelled status           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src/db/api.ts - cancelOrder()                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  1. Authentication Check                           │  │   │
│  │  │     ❌ Not authenticated → Return error            │  │   │
│  │  │     ✅ Authenticated → Continue                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  2. Authorization Check                            │  │   │
│  │  │     ❌ Not admin → Return error                    │  │   │
│  │  │     ✅ Is admin → Continue                         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  3. Fetch Order                                    │  │   │
│  │  │     ❌ Not found → Return error                    │  │   │
│  │  │     ✅ Found → Continue                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  4. Validate Order Status                          │  │   │
│  │  │     ❌ Not "Pending" → Return error                │  │   │
│  │  │     ✅ Is "Pending" → Continue                     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  5. Update Order in Database                       │  │   │
│  │  │     - status = "Cancelled"                         │  │   │
│  │  │     - cancelled_at = current timestamp             │  │   │
│  │  │     - cancelled_by = admin user ID                 │  │   │
│  │  │     - cancellation_reason = selected reason        │  │   │
│  │  │     - updated_at = current timestamp               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  6. Create Audit Log Entry                         │  │   │
│  │  │     - action: "CANCEL_ORDER"                       │  │   │
│  │  │     - entity_type: "order"                         │  │   │
│  │  │     - entity_id: order ID                          │  │   │
│  │  │     - old_values: { status: "Pending" }            │  │   │
│  │  │     - new_values: { status, cancelled_by, ... }    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  7. Return Success Response                        │  │   │
│  │  │     { success: true, message: "..." }              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase PostgreSQL                                     │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  orders table                                      │  │   │
│  │  │  - id (uuid)                                       │  │   │
│  │  │  - status (order_status) → "Cancelled"            │  │   │
│  │  │  - cancelled_at (timestamptz) → NOW()             │  │   │
│  │  │  - cancelled_by (uuid) → admin_user_id            │  │   │
│  │  │  - cancellation_reason (text) → reason            │  │   │
│  │  │  - updated_at (timestamptz) → NOW()               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  audit_logs table                                  │  │   │
│  │  │  - id (uuid)                                       │  │   │
│  │  │  - user_id (uuid) → admin_user_id                 │  │   │
│  │  │  - action (text) → "CANCEL_ORDER"                 │  │   │
│  │  │  - entity_type (text) → "order"                   │  │   │
│  │  │  - entity_id (uuid) → order_id                    │  │   │
│  │  │  - old_values (jsonb) → previous state            │  │   │
│  │  │  - new_values (jsonb) → new state                 │  │   │
│  │  │  - created_at (timestamptz) → NOW()               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## User Journey Flow

```
START
  │
  ├─→ Admin navigates to Order Monitoring
  │
  ├─→ Admin clicks "View Details" on a pending order
  │
  ├─→ Order Detail page loads
  │
  ├─→ Admin sees "Cancel Order" button
  │       │
  │       ├─→ [If order is NOT Pending]
  │       │   └─→ Button is hidden ❌
  │       │
  │       └─→ [If order IS Pending]
  │           └─→ Button is visible ✅
  │
  ├─→ Admin clicks "Cancel Order" button
  │
  ├─→ Confirmation dialog opens
  │
  ├─→ Admin selects cancellation reason
  │       │
  │       ├─→ [Predefined reason selected]
  │       │   └─→ Ready to confirm ✅
  │       │
  │       └─→ ["Other" selected]
  │           └─→ Custom text field appears
  │               └─→ Admin types custom reason
  │                   └─→ Ready to confirm ✅
  │
  ├─→ Admin clicks "Confirm Cancellation"
  │
  ├─→ Frontend validates inputs
  │       │
  │       ├─→ [Validation fails]
  │       │   └─→ Show error toast ❌
  │       │       └─→ Return to dialog
  │       │
  │       └─→ [Validation passes]
  │           └─→ Continue ✅
  │
  ├─→ API call to cancelOrder()
  │
  ├─→ Backend validates request
  │       │
  │       ├─→ [Not authenticated]
  │       │   └─→ Return error ❌
  │       │
  │       ├─→ [Not admin]
  │       │   └─→ Return error ❌
  │       │
  │       ├─→ [Order not found]
  │       │   └─→ Return error ❌
  │       │
  │       ├─→ [Order not pending]
  │       │   └─→ Return error ❌
  │       │
  │       └─→ [All checks pass]
  │           └─→ Continue ✅
  │
  ├─→ Database updates
  │       │
  │       ├─→ Update orders table
  │       │   └─→ Set status to "Cancelled"
  │       │   └─→ Record cancelled_by
  │       │   └─→ Record cancelled_at
  │       │   └─→ Record cancellation_reason
  │       │
  │       └─→ Create audit log entry
  │           └─→ Record complete history
  │
  ├─→ Success response returned
  │
  ├─→ Frontend shows success toast ✅
  │
  ├─→ Dialog closes
  │
  ├─→ Order data refreshes
  │
  ├─→ UI updates to show:
  │       │
  │       ├─→ Status badge: "Cancelled" (red)
  │       ├─→ Cancel button: Hidden
  │       ├─→ Cancellation Details card: Visible
  │       │   └─→ Shows reason and timestamp
  │       └─→ Timeline: Shows cancellation event
  │
END ✅
```

## Error Handling Flow

```
ERROR SCENARIOS
  │
  ├─→ [Frontend Validation Errors]
  │   │
  │   ├─→ No reason selected
  │   │   └─→ Toast: "Please select a cancellation reason"
  │   │
  │   └─→ "Other" selected but no custom reason
  │       └─→ Toast: "Please provide a custom reason"
  │
  ├─→ [Backend Authentication Errors]
  │   │
  │   └─→ User not logged in
  │       └─→ Response: "Not authenticated"
  │       └─→ Toast: Error message displayed
  │
  ├─→ [Backend Authorization Errors]
  │   │
  │   └─→ User is not admin
  │       └─→ Response: "Unauthorized: Admin access required"
  │       └─→ Toast: Error message displayed
  │
  ├─→ [Backend Validation Errors]
  │   │
  │   ├─→ Order not found
  │   │   └─→ Response: "Order not found"
  │   │   └─→ Toast: Error message displayed
  │   │
  │   └─→ Order not pending
  │       └─→ Response: "Order cannot be cancelled because it is no longer pending (current status: {status})"
  │       └─→ Toast: Error message displayed
  │
  ├─→ [Database Errors]
  │   │
  │   ├─→ Failed to fetch order
  │   │   └─→ Response: "Failed to fetch order"
  │   │   └─→ Toast: Error message displayed
  │   │
  │   └─→ Failed to update order
  │       └─→ Response: "Failed to cancel order"
  │       └─→ Toast: Error message displayed
  │
  └─→ [Unexpected Errors]
      │
      └─→ Catch-all error handler
          └─→ Response: "An unexpected error occurred"
          └─→ Toast: Error message displayed
          └─→ Error logged to console
```

## Security Validation Flow

```
SECURITY CHECKS
  │
  ├─→ [Layer 1: Frontend UI]
  │   │
  │   └─→ Button visibility check
  │       └─→ Only show for pending orders
  │       └─→ UI-level protection only
  │
  ├─→ [Layer 2: API Authentication]
  │   │
  │   └─→ supabase.auth.getUser()
  │       │
  │       ├─→ No user → REJECT ❌
  │       └─→ User exists → Continue ✅
  │
  ├─→ [Layer 3: API Authorization]
  │   │
  │   └─→ getCurrentProfile()
  │       └─→ Check role includes 'admin'
  │           │
  │           ├─→ Not admin → REJECT ❌
  │           └─→ Is admin → Continue ✅
  │
  ├─→ [Layer 4: Business Logic Validation]
  │   │
  │   ├─→ Order exists?
  │   │   │
  │   │   ├─→ No → REJECT ❌
  │   │   └─→ Yes → Continue ✅
  │   │
  │   └─→ Order status is "Pending"?
  │       │
  │       ├─→ No → REJECT ❌
  │       └─→ Yes → Continue ✅
  │
  ├─→ [Layer 5: Database Constraints]
  │   │
  │   ├─→ Foreign key constraints
  │   │   └─→ cancelled_by references profiles(id)
  │   │
  │   └─→ Enum constraints
  │       └─→ status must be valid order_status
  │
  └─→ [Layer 6: Audit Trail]
      │
      └─→ All actions logged
          └─→ Who, what, when, why
          └─→ Immutable audit record
```

## Data Flow Diagram

```
┌──────────────┐
│  Admin User  │
└──────┬───────┘
       │
       │ 1. Click "Cancel Order"
       ▼
┌──────────────────────┐
│  React Component     │
│  (AdminOrderDetail)  │
└──────┬───────────────┘
       │
       │ 2. Show dialog, collect reason
       ▼
┌──────────────────────┐
│  Form Validation     │
└──────┬───────────────┘
       │
       │ 3. Call API: cancelOrder(orderId, reason)
       ▼
┌──────────────────────┐
│  API Function        │
│  (src/db/api.ts)     │
└──────┬───────────────┘
       │
       │ 4. Authenticate & Authorize
       ▼
┌──────────────────────┐
│  Supabase Auth       │
└──────┬───────────────┘
       │
       │ 5. Fetch & validate order
       ▼
┌──────────────────────┐
│  Supabase Database   │
│  (orders table)      │
└──────┬───────────────┘
       │
       │ 6. Update order record
       ▼
┌──────────────────────┐
│  Database UPDATE     │
│  - status            │
│  - cancelled_at      │
│  - cancelled_by      │
│  - cancellation_     │
│    reason            │
└──────┬───────────────┘
       │
       │ 7. Create audit log
       ▼
┌──────────────────────┐
│  Supabase Database   │
│  (audit_logs table)  │
└──────┬───────────────┘
       │
       │ 8. Return success
       ▼
┌──────────────────────┐
│  API Response        │
│  { success: true }   │
└──────┬───────────────┘
       │
       │ 9. Show toast, refresh UI
       ▼
┌──────────────────────┐
│  Updated UI          │
│  - Cancelled badge   │
│  - Details card      │
│  - Timeline event    │
└──────────────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
