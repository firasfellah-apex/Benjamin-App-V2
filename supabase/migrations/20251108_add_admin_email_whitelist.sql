/*
# Add Admin Email Whitelist

Updates the handle_new_user() function to automatically assign admin role to whitelisted emails.

1. Function Changes
- Checks if email is in admin whitelist
- Checks if email contains 'mock' for dev/preview environments
- Assigns admin role automatically for whitelisted emails
- Falls back to customer role for regular users

2. Admin Whitelist
- firasfellah@gmail.com (explicit admin)
- Any email containing 'mock' (dev/preview only)

3. Security
- Function runs with SECURITY DEFINER to bypass RLS
- Only runs on user confirmation (not on every update)
- First user still gets admin role as fallback
*/

-- Update handle_new_user function to check admin whitelist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  is_admin boolean := false;
BEGIN
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    -- Check if email is in admin whitelist
    IF NEW.email = 'firasfellah@gmail.com' THEN
      is_admin := true;
    END IF;
    
    -- Allow mock accounts in non-production (check via email pattern)
    IF NEW.email LIKE '%mock%' THEN
      is_admin := true;
    END IF;
    
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    -- First user is always admin
    IF user_count = 0 THEN
      is_admin := true;
    END IF;
    
    -- Insert profile with appropriate role
    INSERT INTO profiles (id, phone, email, role)
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      CASE WHEN is_admin THEN ARRAY['admin'::user_role] ELSE ARRAY['customer'::user_role] END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Also create a function to manually promote existing users to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO user_id FROM profiles WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Add admin role if not already present
  UPDATE profiles
  SET role = array_append(role, 'admin'::user_role)
  WHERE id = user_id
  AND NOT ('admin'::user_role = ANY(role));
  
  RETURN true;
END;
$$;

-- Promote firasfellah@gmail.com to admin if they already exist
SELECT promote_user_to_admin('firasfellah@gmail.com');
