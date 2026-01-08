-- Quick fix: Enable RLS and add policy for user_push_tokens
-- Run this in Supabase SQL Editor if RLS is blocking token saves

-- Enable RLS if not already enabled
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own push tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_push_tokens'
      AND policyname = 'Users manage own push tokens'
  ) THEN
    CREATE POLICY "Users manage own push tokens"
    ON public.user_push_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Verify RLS is enabled and policy exists
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_push_tokens';

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'user_push_tokens';

