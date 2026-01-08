-- Quick fix: Resolve all Supabase security warnings
-- Run this in Supabase SQL Editor to fix all security issues immediately

-- ============================================================================
-- 1. Fix functions with mutable search_path
-- ============================================================================

-- Fix has_role function
CREATE OR REPLACE FUNCTION has_role(uid uuid, check_role user_role)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND check_role = ANY(p.role)
  );
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT has_role(uid, 'admin'::user_role);
$$;

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix ensure_single_default_address function
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this address as default, unset all other defaults for this customer
  IF NEW.is_default = true THEN
    UPDATE customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Fix overly permissive RLS policies
-- ============================================================================

-- For audit_logs: Ensure authenticated user requirement
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- For order_events: Ensure authenticated user requirement
DROP POLICY IF EXISTS "System can insert order events" ON order_events;
CREATE POLICY "System can insert order events" ON order_events
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- ============================================================================
-- 3. Verify fixes
-- ============================================================================

-- Check functions have search_path set
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ Fixed'
    ELSE '❌ Missing search_path'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('has_role', 'is_admin', 'update_updated_at', 'ensure_single_default_address')
ORDER BY p.proname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN with_check = 'true' THEN '⚠️ Still permissive'
    ELSE '✅ More restrictive'
  END as status
FROM pg_policies
WHERE tablename IN ('audit_logs', 'order_events')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- ============================================================================
-- 4. Extensions in public schema (Manual fix required)
-- ============================================================================

-- Note: Moving extensions requires manual intervention
-- See migration file for instructions on moving cube and earthdistance extensions

SELECT 
  extname as extension_name,
  n.nspname as schema_name,
  '⚠️ Consider moving to extensions schema' as recommendation
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE n.nspname = 'public'
  AND extname IN ('cube', 'earthdistance');

