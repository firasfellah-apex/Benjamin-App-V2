-- Enable RLS and add policy for user_push_tokens table
-- Users can only manage their own push tokens

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

