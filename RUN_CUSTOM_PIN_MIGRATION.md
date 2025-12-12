# 🚨 URGENT: Run Migration to Enable Custom Pin Coordinates

## The Problem
You're getting a 400 error when trying to save an address because **the migration hasn't been applied yet**. The database doesn't have the `custom_pin_lat` and `custom_pin_lng` columns.

## Quick Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Migration
Copy and paste the **entire contents** below into the SQL Editor and click "Run":

```sql
-- Add custom pin coordinate columns
ALTER TABLE customer_addresses 
  ADD COLUMN IF NOT EXISTS custom_pin_lat double precision,
  ADD COLUMN IF NOT EXISTS custom_pin_lng double precision;

-- Add comment explaining the purpose
COMMENT ON COLUMN customer_addresses.custom_pin_lat IS 'Custom latitude set by customer when moving the map pin. Used for runner meeting location. ATM selection uses original latitude.';
COMMENT ON COLUMN customer_addresses.custom_pin_lng IS 'Custom longitude set by customer when moving the map pin. Used for runner meeting location. ATM selection uses original longitude.';
```

### Step 3: Verify It Worked
Run this query to verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_addresses' 
AND column_name IN ('custom_pin_lat', 'custom_pin_lng');
```

You should see both columns listed.

### Step 4: Test
1. Refresh your app (hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`)
2. Try to add a new address
3. It should work now!

## Why This Happened

The migration file `supabase/migrations/20250130_add_custom_pin_coordinates.sql` was created but **not applied to your Supabase database**. The code is trying to save custom pin coordinates, but the database columns don't exist yet.

## Need Help?

If you're still getting errors after running the migration:
1. Check the browser console for the detailed error message
2. Verify the migration ran successfully (no errors in Supabase SQL Editor)
3. Make sure you copied the entire SQL content, not just the filename

