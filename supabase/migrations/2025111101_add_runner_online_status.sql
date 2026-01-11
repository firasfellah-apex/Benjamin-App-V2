-- Add is_online column to profiles table
-- This allows runners to mark themselves as available/unavailable for accepting jobs

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Create index for faster queries when filtering by online status
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;









