-- Add is_online column to profiles table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Step 3: Create index for faster queries when filtering by online status
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;

-- Step 4: Add RLS policy to allow runners to update their own is_online status
-- (This assumes you already have a policy for users to update their own profile)
-- If you don't have one, uncomment the following:

-- CREATE POLICY "Runners can update their own is_online"
-- ON public.profiles
-- FOR UPDATE
-- TO authenticated
-- USING (auth.uid() = id)
-- WITH CHECK (auth.uid() = id);

-- Or if you want a more specific policy just for is_online:
-- Note: Supabase doesn't support column-level policies directly,
-- but you can use a policy that checks the column in the USING clause

-- Verify the column was added:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_online';

