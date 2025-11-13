# Rating Fix - Migration Guide

## Problem
Runner app cannot rate customers - getting 400 error when trying to update `customer_rating_by_runner` field.

## Root Cause
1. The FSM migration removed the "Runners can update assigned orders" policy
2. Runners need explicit permission to update rating fields on completed orders
3. Rating columns might not exist if migration hasn't been run

## Solution

### Step 1: Run Rating Columns Migration
If you haven't run this migration yet, run it first:

**File:** `supabase/migrations/20250113_add_ratings_to_orders.sql`

This adds:
- `runner_rating` (INT, 1-5)
- `runner_rating_comment` (TEXT)
- `customer_rating_by_runner` (INT, 1-5)
- `customer_rating_tags` (TEXT)

### Step 2: Run Rating Permissions Migration
**File:** `supabase/migrations/20250114_allow_runner_customer_ratings.sql`

This adds RLS policies to allow:
- Runners to update `customer_rating_by_runner` for completed orders they're assigned to
- Customers to update `runner_rating` for completed orders they own
- Updates the SELECT policy so runners can view completed orders they're assigned to

### Step 3: Verify Migrations Applied

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if rating columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('runner_rating', 'customer_rating_by_runner');

-- Check if policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'orders' 
AND policyname LIKE '%rating%';
```

### Step 4: Test Rating Functionality

1. **As Runner:**
   - Complete an order (go through full delivery flow)
   - On completed order detail page, you should see "Rate this customer" section
   - Click stars to rate (1-5)
   - Rating should save successfully

2. **As Customer:**
   - Complete an order (receive delivery)
   - On completed order detail page, you should see "Rate your runner" section
   - Click stars to rate (1-5)
   - Rating should save successfully

3. **As Admin:**
   - View any completed order
   - Should see both ratings displayed in the "Ratings" card
   - Customer → Runner rating
   - Runner → Customer rating

## Code Changes Made

1. **`src/db/api.ts`:**
   - Updated `rateRunner()` to use `select("*")` instead of specific columns
   - Updated `rateCustomerByRunner()` to use `select("*")` instead of specific columns
   - Added better error handling for missing columns and permissions
   - Added user authentication checks
   - Added extra security checks in UPDATE queries

2. **`src/pages/runner/RunnerOrderDetail.tsx`:**
   - Rating UI already exists and should work after migrations are applied

3. **`src/pages/customer/OrderTracking.tsx` / `ActiveDeliverySheet.tsx`:**
   - Rating UI already exists and should work after migrations are applied

4. **`src/pages/admin/AdminOrderDetail.tsx`:**
   - Rating display already exists and shows both ratings

## Troubleshooting

### Error: "Permission denied"
- Run migration `20250114_allow_runner_customer_ratings.sql`
- Check that policies were created successfully
- Verify user has correct role (runner/customer)

### Error: "Column doesn't exist"
- Run migration `20250113_add_ratings_to_orders.sql`
- Verify columns exist in database

### Error: "Order not found"
- Check that runner is assigned to the order (`runner_id = auth.uid()`)
- Check that order status is "Completed"
- Verify SELECT policy allows runner to view completed orders

### Rating not showing in Admin
- Check that order status is "Completed"
- Verify ratings were saved successfully (check database)
- Check that AdminOrderDetail is fetching order with rating fields

## Database Schema

After migrations, the `orders` table should have:
- `runner_rating` INT CHECK (runner_rating BETWEEN 1 AND 5)
- `customer_rating_by_runner` INT CHECK (customer_rating_by_runner BETWEEN 1 AND 5)
- `runner_rating_comment` TEXT
- `customer_rating_tags` TEXT

## RLS Policies

After migrations, these policies should exist:
1. "Runners can rate customers on completed orders" - Allows runners to UPDATE rating fields
2. "Customers can rate runners on completed orders" - Allows customers to UPDATE rating fields
3. "Runners can view available and assigned orders" - Updated to allow viewing completed orders

## Testing Checklist

- [ ] Migration `20250113_add_ratings_to_orders.sql` applied
- [ ] Migration `20250114_allow_runner_customer_ratings.sql` applied
- [ ] Runner can rate customer on completed order
- [ ] Customer can rate runner on completed order
- [ ] Admin can see both ratings
- [ ] Ratings persist after page refresh
- [ ] Cannot rate twice (already rated check works)
- [ ] Cannot rate non-completed orders
- [ ] Error messages are clear and helpful









