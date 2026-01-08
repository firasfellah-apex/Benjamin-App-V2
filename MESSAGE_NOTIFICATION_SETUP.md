# Message Push Notification Setup Guide

## ✅ Completed Steps

### 1. Edge Function Updated
- ✅ Added `getWebhookSecret()` helper function
- ✅ Updated auth logic to support both JWT (in-app) and webhook secret (database trigger) calls
- ✅ Function ready to accept webhook calls

### 2. JWT Verification Turned Off
- ✅ You've already disabled "Verify JWT" in Supabase Dashboard for `notify-message-event`

## 🔧 Remaining Steps

### Step 1: Set Webhook Secret

Run this command (requires authentication):

```bash
supabase secrets set --project-ref uqpcyqcpnhjkpyyjlmqr \
  WEBHOOK_SECRET="benjamin_dev_webhook_secret_change_me"
```

**Or set it via Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add new secret:
   - **Name**: `WEBHOOK_SECRET`
   - **Value**: `benjamin_dev_webhook_secret_change_me`

### Step 2: Deploy Updated Function

```bash
supabase functions deploy notify-message-event --project-ref uqpcyqcpnhjkpyyjlmqr
```

### Step 3: Create Database Trigger

You have two options:

#### Option A: Use Supabase Dashboard Webhooks (Easiest)

1. Go to **Database** → **Webhooks** (or **Hooks**)
2. Click **Create Webhook**
3. Configure:
   - **Name**: `notify-message-event`
   - **Table**: `messages`
   - **Events**: `INSERT` only
   - **URL**: `https://uqpcyqcpnhjkpyyjlmqr.supabase.co/functions/v1/notify-message-event`
   - **Method**: `POST`
   - **Headers**:
     - `x-webhook-secret`: `benjamin_dev_webhook_secret_change_me`
   - **Body** (if template available):
     ```json
     {
       "message_id": "{{record.id}}"
     }
     ```

#### Option B: Use SQL Migration (If Dashboard Webhooks Not Available)

1. Apply the migration:
   ```bash
   supabase db push
   ```

   Or run the SQL directly in Supabase SQL Editor:
   - Open `supabase/migrations/20250108_create_message_notification_trigger.sql`
   - Copy contents
   - Paste into SQL Editor
   - Run

2. **Important**: Update the webhook secret in the function if you changed it:
   ```sql
   -- Update the webhook secret in the function
   CREATE OR REPLACE FUNCTION notify_message_event()
   RETURNS TRIGGER AS $$
   DECLARE
     edge_function_url text;
     webhook_secret text;
   BEGIN
     edge_function_url := 'https://uqpcyqcpnhjkpyyjlmqr.supabase.co/functions/v1/notify-message-event';
     webhook_secret := 'benjamin_dev_webhook_secret_change_me'; -- Update this if you changed the secret
     
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
   ```

## 🧪 Testing

After setup, test by:

1. **Send a message** in the app (customer → runner or runner → customer)
2. **Check edge function logs** in Supabase Dashboard → Edge Functions → `notify-message-event` → Logs
3. **Verify push notification** is received on the recipient's device

## 📋 How It Works

1. **Message Inserted**: When a new row is inserted into `messages` table
2. **Trigger Fires**: Database trigger calls `notify_message_event()` function
3. **HTTP Call**: Function makes POST request to edge function with webhook secret
4. **Edge Function**: 
   - Validates webhook secret
   - Loads message and order data
   - Determines recipient (customer ↔ runner)
   - Sends push notification via FCM
5. **Push Delivered**: Recipient receives notification on their device

## 🔒 Security

- ✅ Webhook secret protects against unauthorized calls
- ✅ Function validates secret before processing
- ✅ Database trigger uses `SECURITY DEFINER` for proper permissions
- ✅ Edge function still supports JWT auth for in-app calls

## 🐛 Troubleshooting

### No notifications received?

1. **Check edge function logs**:
   - Dashboard → Edge Functions → `notify-message-event` → Logs
   - Look for errors or warnings

2. **Verify trigger exists**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_message_event';
   ```

3. **Test trigger manually**:
   ```sql
   -- Insert a test message and check logs
   INSERT INTO messages (order_id, sender_id, sender_role, body)
   VALUES ('your-order-id', 'your-user-id', 'customer', 'Test message');
   ```

4. **Verify webhook secret matches**:
   - Check secret in Dashboard → Edge Functions → Secrets
   - Ensure it matches the value in trigger function or webhook config

5. **Check FCM configuration**:
   - Verify `FCM_SERVICE_ACCOUNT_JSON` and `FCM_PROJECT_ID` are set
   - Check edge function logs for FCM errors

