# Fix Runner Online/Offline Toggle

## Issue
The runner online/offline toggle is failing with error:
```
Error updating online status: Could not find the 'is_online' column of 'profiles' in the schema cache
```

## Root Cause
The `is_online` column doesn't exist in the `profiles` table in Supabase. The code expects this column but it hasn't been added yet.

## Solution

### Step 1: Add the Column in Supabase

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **profiles**
3. Click **+ New column**
4. Create:
   - **Name**: `is_online`
   - **Type**: `boolean`
   - **Default value**: `false`
   - **Nullable**: `false` (unchecked)

**Option B: Using SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Run the SQL from `ADD_IS_ONLINE_COLUMN.sql`:

```sql
-- Add is_online column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;
```

### Step 2: Verify RLS Policies

Make sure runners can update their own `is_online` status. If you have a generic policy like:

```sql
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

This should already cover `is_online`. If not, you may need to add a specific policy.

### Step 3: Clear Schema Cache (if needed)

If Supabase still shows the error after adding the column:
1. Wait a few seconds for the schema cache to refresh
2. Or restart your Supabase project (if using local development)
3. Or refresh your browser

### Step 4: Test the Toggle

1. Log in as a runner
2. Go to the runner dashboard
3. Toggle the "Online/Offline" switch in the header
4. Verify:
   - ✅ No error in console
   - ✅ Toast notification shows success
   - ✅ Status updates immediately
   - ✅ Database shows updated `is_online` value

## Code Changes Made

### 1. `src/db/api.ts` - `updateRunnerOnlineStatus()`
- ✅ Improved error handling with user-friendly messages
- ✅ Returns updated profile data on success
- ✅ Better error detection for schema cache issues
- ✅ Selects `is_online` when fetching profile to verify it exists

### 2. `src/components/layout/RunnerHeader.tsx` - `handleOnlineToggle()`
- ✅ Improved error handling
- ✅ Rollback on error (refreshes profile to revert optimistic update)
- ✅ User-friendly error messages
- ✅ Better error detection for schema issues

## Expected Behavior After Fix

1. **Toggle Online**: Runner clicks toggle → Status updates immediately → Success toast → Database updated
2. **Toggle Offline**: Runner clicks toggle → Status updates immediately → Success toast → Database updated
3. **Error Handling**: If database update fails → Profile refreshes → Error toast with clear message

## Verification

After adding the column, verify it exists:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_online';
```

Should return:
- `column_name`: `is_online`
- `data_type`: `boolean`
- `column_default`: `false`
- `is_nullable`: `NO`

## Notes

- The code already handles the `is_online` column correctly
- The only missing piece is the database column itself
- Once the column is added, the toggle should work immediately
- No code changes needed after adding the column









