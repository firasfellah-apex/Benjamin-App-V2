-- ============================================================================
-- Create Database Trigger for Message Push Notifications
-- ============================================================================
-- Purpose: Automatically call notify-message-event edge function when a new message is inserted
-- Security: Uses webhook secret for authentication (no user JWT needed)

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call the edge function
CREATE OR REPLACE FUNCTION notify_message_event()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url text;
  webhook_secret text;
BEGIN
  -- Get the edge function URL from environment or construct it
  -- Replace with your actual project ref if different
  edge_function_url := 'https://uqpcyqcpnhjkpyyjlmqr.supabase.co/functions/v1/notify-message-event';
  
  -- Get webhook secret from vault (set via Supabase Dashboard or CLI)
  -- For now, using the default value - update this after setting the secret
  webhook_secret := 'benjamin_dev_webhook_secret_change_me';
  
  -- Call the edge function via HTTP POST
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires on INSERT
DROP TRIGGER IF EXISTS trigger_notify_message_event ON messages;
CREATE TRIGGER trigger_notify_message_event
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_event();

-- Add comment
COMMENT ON FUNCTION notify_message_event() IS 'Calls notify-message-event edge function when a new message is inserted to send push notifications to recipients';

