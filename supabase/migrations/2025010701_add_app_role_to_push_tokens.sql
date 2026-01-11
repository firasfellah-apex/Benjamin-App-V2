
-- Add app_role column and update uniqueness to allow one token per (user, role)

ALTER TABLE public.user_push_tokens
  ADD COLUMN IF NOT EXISTS app_role text NOT NULL DEFAULT 'customer';

-- Drop the old uniqueness constraint if it exists (commonly user_id + token)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_push_tokens_user_id_token_key'
      AND conrelid = 'public.user_push_tokens'::regclass
  ) THEN
    ALTER TABLE public.user_push_tokens
      DROP CONSTRAINT user_push_tokens_user_id_token_key;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- table doesn't exist in this environment
  NULL;
END $$;

-- Add the new uniqueness constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_push_tokens_user_id_token_app_role_key'
      AND conrelid = 'public.user_push_tokens'::regclass
  ) THEN
    ALTER TABLE public.user_push_tokens
      ADD CONSTRAINT user_push_tokens_user_id_token_app_role_key
      UNIQUE (user_id, token, app_role);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Optional: helpful index for lookups by user/role
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_app_role_idx
  ON public.user_push_tokens (user_id, app_role);
