# 📱 Push Notifications Setup Guide

This guide will help you set up push notifications for the Benjamin app using Capacitor's Push Notifications plugin.

## ✅ What's Already Done

- ✅ `@capacitor/push-notifications` plugin installed
- ✅ Push notification service created (`src/lib/pushNotifications.ts`)
- ✅ React hook created (`src/hooks/usePushNotifications.ts`)
- ✅ Initialization added to `main.tsx`
- ✅ Event listeners configured

## 📋 Current Status

**Status**: ⚠️ **Partially Implemented**

- ✅ Frontend code ready
- ⚠️ Backend token storage needed
- ⚠️ FCM/APNs configuration needed
- ⚠️ Notification sending service needed

## 🔧 Setup Required

### 1. Firebase Cloud Messaging (FCM) for Android

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add Android app to project
4. Package name: `com.benjamin.app`
5. Download `google-services.json`
6. Place it in `android/app/`

#### Step 2: Configure Android

1. Update `android/build.gradle`:
   ```gradle
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.4.0'
       }
   }
   ```

2. Update `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
       implementation 'com.google.firebase:firebase-messaging:23.4.0'
   }
   ```

3. Sync Gradle in Android Studio

#### Step 3: Get FCM Server Key

1. Firebase Console → Project Settings → Cloud Messaging
2. Copy "Server key" (for backend)
3. Copy "Sender ID" (for backend)

### 2. Apple Push Notification Service (APNs) for iOS

#### Step 1: Configure in Apple Developer

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Create App ID: `com.benjamin.app`
3. Enable "Push Notifications" capability
4. Create APNs Key or Certificate:
   - **APNs Key** (recommended): Create in Keys section
   - Download `.p8` file
   - Note Key ID and Team ID

#### Step 2: Configure in Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select project → Signing & Capabilities
3. Add "Push Notifications" capability
4. Add "Background Modes" capability
5. Enable "Remote notifications"

#### Step 3: Update Capacitor Config

The config is already set up, but verify `capacitor.config.ts`:

```typescript
{
  appId: 'com.benjamin.app',
  // ... other config
}
```

### 3. Backend Integration

#### Step 1: Create Database Table for Tokens

```sql
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_token ON user_push_tokens(token);
```

#### Step 2: Create API Endpoint to Save Tokens

Create a Supabase Edge Function or API endpoint:

```typescript
// Example: Supabase Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { token, platform, deviceId } = await req.json();
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Upsert token
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform,
      device_id: deviceId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,token',
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### Step 3: Update Frontend to Save Tokens

Update `src/lib/pushNotifications.ts`:

```typescript
import { supabase } from '@/db/supabase';

async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,token',
    });

  if (error) {
    console.error('Error saving push token:', error);
    throw error;
  }

  console.log('[Push Notifications] Token saved successfully');
}
```

### 4. Notification Sending Service

#### Option A: Supabase Edge Function

Create an Edge Function that sends notifications when order status changes:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FCM Admin SDK (for Android)
import { initializeApp, cert } from 'https://esm.sh/firebase-admin@11.11.0/app';
import { getMessaging } from 'https://esm.sh/firebase-admin@11.11.0/messaging';

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert({
    projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
    privateKey: Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
  }),
});

const messaging = getMessaging(firebaseApp);

serve(async (req) => {
  const { userId, title, body, data } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get user's push tokens
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ message: 'No tokens found' }), { status: 200 });
  }

  const results = [];

  for (const { token, platform } of tokens) {
    try {
      if (platform === 'android') {
        // Send via FCM
        const message = {
          token,
          notification: { title, body },
          data: data || {},
        };
        const response = await messaging.send(message);
        results.push({ token, platform, success: true, messageId: response });
      } else if (platform === 'ios') {
        // Send via APNs (using FCM or direct APNs)
        // FCM can also send to iOS
        const message = {
          token,
          notification: { title, body },
          data: data || {},
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };
        const response = await messaging.send(message);
        results.push({ token, platform, success: true, messageId: response });
      }
    } catch (error) {
      console.error(`Error sending to ${token}:`, error);
      results.push({ token, platform, success: false, error: error.message });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### Option B: Database Trigger + Edge Function

Create a database trigger that calls the Edge Function when order status changes:

```sql
-- Create function to send push notification
CREATE OR REPLACE FUNCTION send_order_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via HTTP
  -- This is a placeholder - actual implementation depends on your setup
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'userId', NEW.customer_id,
      'title', 'Order Update',
      'body', 'Your order status has been updated',
      'data', jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER order_status_notification_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION send_order_status_notification();
```

### 5. Notification Scenarios

#### Customer Notifications

- **Order Created**: "Your cash delivery request has been received"
- **Runner Assigned**: "A runner has been assigned to your delivery"
- **Runner at ATM**: "Your runner is preparing your cash"
- **Cash Withdrawn**: "Your runner is on the way with your cash"
- **Runner Arrived**: "Your runner has arrived"
- **Order Completed**: "Your delivery has been completed"

#### Runner Notifications

- **New Order Available**: "A new delivery request is available"
- **Order Accepted**: "You've accepted the delivery"
- **OTP Generated**: "OTP code has been generated for delivery"
- **Order Completed**: "Delivery completed successfully"

## 🧪 Testing

### Test on Android

1. Build and run on Android device
2. Check logs for token registration
3. Send test notification via Firebase Console
4. Verify notification received

### Test on iOS

1. Build and run on iOS device (simulator doesn't support push)
2. Check logs for token registration
3. Send test notification via APNs or FCM
4. Verify notification received

## 📝 Environment Variables

Add to your `.env.local`:

```bash
# Firebase (for Android FCM)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# APNs (for iOS) - if using direct APNs
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_BUNDLE_ID=com.benjamin.app
APNS_KEY_PATH=path/to/AuthKey.p8
```

## 🔒 Security Considerations

1. **Token Storage**: Store tokens securely in database
2. **Token Validation**: Validate tokens before sending
3. **User Authentication**: Only send to authenticated users
4. **Rate Limiting**: Limit notification frequency
5. **Privacy**: Don't include sensitive data in notifications

## 📚 Resources

- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## ✅ Implementation Checklist

- [ ] Firebase project created
- [ ] `google-services.json` added to Android
- [ ] Android Gradle configured
- [ ] Apple Developer account configured
- [ ] APNs key/certificate created
- [ ] iOS capabilities enabled in Xcode
- [ ] Database table created for tokens
- [ ] API endpoint created to save tokens
- [ ] Frontend updated to save tokens
- [ ] Notification sending service created
- [ ] Database trigger created (optional)
- [ ] Tested on Android device
- [ ] Tested on iOS device

## 🎯 Next Steps

1. **Set up Firebase** for Android FCM
2. **Configure APNs** for iOS
3. **Create database table** for tokens
4. **Implement token saving** in frontend
5. **Create notification service** (Edge Function)
6. **Test on devices**

---

**Status**: Frontend ready, backend setup needed

**Estimated Time**: 4-6 hours for complete setup

Good luck! 🚀

