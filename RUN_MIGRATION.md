# Run Database Migration

## Issue: `is_online` column missing

The error "Could not find the 'is_online' column of 'profiles' in the schema cache" means the migration hasn't been run yet.

## Solution: Run the migration in Supabase

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the migration**
   - Copy and paste the following SQL:

```sql
-- Add is_online column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Create index for faster queries when filtering by online status
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;
```

3. **Click "Run"** to execute the migration

4. **Verify**
   - The migration should complete successfully
   - The `is_online` column should now exist in the `profiles` table

## Alternative: If using Supabase CLI

If you have Supabase CLI set up locally:

```bash
supabase db push
```

This will run all pending migrations in the `supabase/migrations/` directory.

