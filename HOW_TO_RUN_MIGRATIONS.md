# How to Run SQL Migrations in Supabase

## ⚠️ Important: Don't type the filename - Copy the SQL content!

You were trying to run the filename `20250114_allow_runner_customer_ratings.sql` as SQL, which caused an error. You need to copy and paste the **SQL content** from the file into the SQL editor.

## Steps to Fix Rating Feature

### Option 1: Use the Combined Migration File (Easiest)

1. **Open Supabase Dashboard** → Go to SQL Editor

2. **Open the file** `RUN_MIGRATIONS_HERE.sql` in this project

3. **Copy ALL the SQL content** from that file (both STEP 1 and STEP 2)

4. **Paste it into the Supabase SQL Editor**

5. **Click "Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

6. **Wait for both steps to complete successfully**

### Option 2: Run Migrations Separately

#### Step 1: Add Rating Columns

1. Open `supabase/migrations/20250113_add_ratings_to_orders.sql`
2. Copy ALL the SQL content (not the filename!)
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Wait for success message

#### Step 2: Add Rating Permissions

1. Open `supabase/migrations/20250114_allow_runner_customer_ratings.sql`
2. Copy ALL the SQL content (not the filename!)
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Wait for success message

## Verify Migrations Applied

Run this query in Supabase SQL Editor to check if columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('runner_rating', 'customer_rating_by_runner');
```

You should see both columns listed.

## Verify Policies Applied

Run this query to check if policies exist:

```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'orders' 
AND policyname LIKE '%rating%';
```

You should see:
- "Runners can rate customers on completed orders"
- "Customers can rate runners on completed orders"

## After Running Migrations

1. **Refresh your app** (hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`)
2. **Test rating functionality:**
   - As runner: Complete an order and try to rate the customer
   - As customer: Complete an order and try to rate the runner
3. **Check admin panel:** Both ratings should be visible for completed orders

## Troubleshooting

### Error: "column already exists"
- The migration uses `IF NOT EXISTS`, so this is safe to ignore
- Continue with Step 2

### Error: "policy already exists"
- The migration uses `DROP POLICY IF EXISTS`, so it should handle this
- If you still get an error, run the DROP statements manually first

### Error: "function has_role does not exist"
- Make sure you've run the initial schema migration first
- Check that `has_role` function exists in your database

### Still getting 400 errors?
1. Check browser console for detailed error messages
2. Verify migrations were applied (use verification queries above)
3. Make sure you're logged in as a runner/customer (not admin)
4. Verify the order status is "Completed"

## What Was Fixed

1. ✅ Removed duplicate "Rate this customer" section from runner UI
2. ✅ Improved error messages in rating API functions
3. ✅ Created combined migration file for easy execution
4. ✅ Added verification queries to check migration status

