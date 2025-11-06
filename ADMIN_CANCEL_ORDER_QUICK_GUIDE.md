# Admin Order Cancellation - Quick Reference Guide

## How to Cancel a Pending Order

### Step 1: Navigate to Order Details
1. Go to **Admin Panel** → **Order Monitoring**
2. Find the pending order you want to cancel
3. Click **"View Details"** button

### Step 2: Initiate Cancellation
1. On the order detail page, look for the **"Cancel Order"** button in the header
   - ⚠️ This button only appears for orders with "Pending" status
2. Click the **"Cancel Order"** button

### Step 3: Select Cancellation Reason
A confirmation dialog will appear. You must:
1. Select a reason from the dropdown:
   - **Customer Request** - Customer asked to cancel
   - **Suspected Fraud** - Fraudulent activity detected
   - **Item Unavailable** - Requested service unavailable
   - **Duplicate Order** - Customer placed duplicate order
   - **Payment Issue** - Payment processing problem
   - **System Error** - Technical system issue
   - **Other** - Custom reason (requires text input)

2. If you select **"Other"**, a text field will appear:
   - Provide a detailed custom reason
   - This field is required

### Step 4: Confirm Cancellation
1. Review your selection
2. Click **"Confirm Cancellation"** button
   - Button will show "Cancelling..." while processing
3. Or click **"Go Back"** to cancel the action

### Step 5: Confirmation
- ✅ Success message will appear: "Order cancelled successfully"
- ❌ Error message will appear if something went wrong
- The page will refresh to show the updated order status

## What Happens After Cancellation

### Order Status
- Order status changes to **"Cancelled"**
- Cancellation timestamp is recorded
- Your admin user ID is recorded as the canceller

### Order Display
- **Cancellation Details Card** appears showing:
  - Cancellation reason
  - Cancellation timestamp
- **Order Timeline** shows cancellation event
- **Cancel Order button** is no longer visible

### Audit Trail
- System creates an audit log entry with:
  - Action: CANCEL_ORDER
  - Admin user who performed the action
  - Timestamp
  - Old status → New status
  - Cancellation reason

## Important Notes

### Permissions
- ⚠️ Only users with **admin role** can cancel orders
- Non-admin users will not see the cancel button
- Backend enforces this restriction for security

### Order Status Restrictions
- ✅ Can only cancel orders with **"Pending"** status
- ❌ Cannot cancel orders that are:
  - Runner Accepted
  - Runner at ATM
  - Cash Withdrawn
  - Pending Handoff
  - Completed
  - Already Cancelled

### Cannot Undo
- ⚠️ **Cancellation cannot be undone**
- Once confirmed, the order status is permanently changed to "Cancelled"
- Choose cancellation reason carefully for audit purposes

## Troubleshooting

### "Cancel Order" Button Not Visible
**Possible Reasons:**
1. Order is not in "Pending" status
2. You don't have admin permissions
3. Order has already been cancelled

**Solution:** Verify order status and your user role

### "Order cannot be cancelled because it is no longer pending"
**Reason:** Order status changed between when you opened the page and clicked confirm

**Solution:** Refresh the page to see current order status

### "Unauthorized: Admin access required"
**Reason:** Your user account doesn't have admin role

**Solution:** Contact system administrator to verify your permissions

### "Please select a cancellation reason"
**Reason:** You didn't select a reason from the dropdown

**Solution:** Select a reason before clicking "Confirm Cancellation"

### "Please provide a custom reason"
**Reason:** You selected "Other" but didn't fill in the custom reason text field

**Solution:** Provide a detailed reason in the text field

## Best Practices

### Choosing Cancellation Reasons
- **Be Specific:** Choose the most accurate reason
- **Use "Other" Sparingly:** Only when no predefined reason fits
- **Provide Details:** When using "Other", be thorough in your explanation
- **Think Audit Trail:** Your reason will be permanently recorded

### When to Cancel Orders
✅ **Good Reasons to Cancel:**
- Customer explicitly requests cancellation
- Fraud detection systems flag the order
- Payment authorization fails
- Service is temporarily unavailable
- Duplicate order detected

❌ **Avoid Cancelling For:**
- Minor delays (unless customer requests)
- Runner assignment issues (try reassignment first)
- Personal judgment calls without clear policy violation

### Communication
- Consider contacting the customer before cancelling
- Document any customer communication in your internal systems
- Use the cancellation reason to provide context for future reference

## Quick Reference: Cancellation Reasons

| Reason | When to Use | Example |
|--------|-------------|---------|
| Customer Request | Customer asks to cancel | "Customer called and requested cancellation" |
| Suspected Fraud | Fraud indicators detected | "Multiple failed payment attempts from different cards" |
| Item Unavailable | Service cannot be provided | "No runners available in customer's area" |
| Duplicate Order | Customer placed same order twice | "Customer accidentally submitted order twice" |
| Payment Issue | Payment processing fails | "Payment authorization declined by bank" |
| System Error | Technical problem | "Order processing error in system" |
| Other | None of the above fit | Provide detailed custom explanation |

## Support

If you encounter issues not covered in this guide:
1. Check the full documentation: `ADMIN_ORDER_CANCELLATION_FEATURE.md`
2. Review audit logs for detailed error information
3. Contact technical support with:
   - Order ID
   - Error message received
   - Steps you took before the error
   - Your admin user ID

---

**Last Updated:** 2025-11-06
**Feature Version:** 1.0
**Documentation Version:** 1.0
