-- Add missing fields to user_push_tokens to match requirements
-- This aligns with the event-driven push notification system

-- Add is_active column (if not exists)
ALTER TABLE public.user_push_tokens
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add last_seen_at column (if not exists)
ALTER TABLE public.user_push_tokens
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

-- Add created_at column (if not exists)
ALTER TABLE public.user_push_tokens
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Update last_seen_at when token is updated
CREATE OR REPLACE FUNCTION update_user_push_token_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = now();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_seen_at
DROP TRIGGER IF EXISTS trg_update_user_push_token_last_seen ON public.user_push_tokens;
CREATE TRIGGER trg_update_user_push_token_last_seen
  BEFORE UPDATE ON public.user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_push_token_last_seen();

-- Index for active device lookups (common query pattern)
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_is_active_idx
  ON public.user_push_tokens (user_id, is_active)
  WHERE is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN public.user_push_tokens.is_active IS 'Whether this device token is currently active. Set to false when token is invalidated.';
COMMENT ON COLUMN public.user_push_tokens.last_seen_at IS 'Last time this device token was used/updated. Used for cleanup of stale tokens.';

