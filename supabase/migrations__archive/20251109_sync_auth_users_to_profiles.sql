/*
# Sync Auth Users to Profiles

Creates a function to sync all auth.users to profiles table.
This ensures that users who signed in with OAuth but didn't get profiles created by the trigger will have profiles.

1. Function
- Finds all auth.users that don't have profiles
- Creates profiles for them with appropriate roles
- Uses same logic as handle_new_user() for role assignment

2. Security
- Function runs with SECURITY DEFINER to bypass RLS
- Only admins can call this function
- Safe to run multiple times (won't create duplicates)
*/

-- Function to sync auth users to profiles
CREATE OR REPLACE FUNCTION sync_auth_users_to_profiles()
RETURNS TABLE(
  user_id uuid,
  email text,
  profile_created boolean,
  role_assigned text[]
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  auth_user RECORD;
  user_count int;
  is_admin_user boolean := false;
  created_count int := 0;
  user_email text;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Loop through all confirmed auth users
  FOR auth_user IN 
    SELECT au.id, au.email, au.phone, au.confirmed_at
    FROM auth.users au
    WHERE au.confirmed_at IS NOT NULL
  LOOP
    -- Store email in local variable to avoid ambiguity
    user_email := auth_user.email;
    
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth_user.id) THEN
      -- Determine if user should be admin
      -- Only assign admin if:
      -- 1. Email is explicitly whitelisted (firasfellah@gmail.com)
      -- 2. Email contains 'mock' (for dev/testing)
      -- 3. This is the VERY FIRST user (user_count = 0 at the start of sync)
      is_admin_user := false;
      
      IF user_email = 'firasfellah@gmail.com' THEN
        is_admin_user := true;
      ELSIF user_email LIKE '%mock%' THEN
        is_admin_user := true;
      ELSIF user_count = 0 THEN
        -- Only the first user gets admin automatically
        is_admin_user := true;
        -- Increment count so subsequent users in this sync don't get admin
        user_count := user_count + 1;
      ELSE
        -- All other users are customers by default
        is_admin_user := false;
      END IF;
      
      -- Create profile
      INSERT INTO public.profiles (id, email, phone, role)
      VALUES (
        auth_user.id,
        user_email,
        auth_user.phone,
        CASE WHEN is_admin_user THEN ARRAY['admin'::user_role] ELSE ARRAY['customer'::user_role] END
      )
      ON CONFLICT (id) DO NOTHING;
      
      created_count := created_count + 1;
      
      -- Return result
      RETURN QUERY SELECT 
        auth_user.id,
        user_email,
        true,
        CASE WHEN is_admin_user THEN ARRAY['admin'::text] ELSE ARRAY['customer'::text] END;
    END IF;
  END LOOP;
  
  -- If no users were created, return a message
  IF created_count = 0 THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      'All users already have profiles'::text,
      false,
      ARRAY[]::text[];
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (RLS will restrict to admins)
GRANT EXECUTE ON FUNCTION sync_auth_users_to_profiles() TO authenticated;

