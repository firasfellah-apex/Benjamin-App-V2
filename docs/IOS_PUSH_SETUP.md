# iOS Push Notifications (APNs) Setup Guide

## Overview

This guide covers setting up Apple Push Notification service (APNs) for the Benjamin iOS app. The app currently supports Android (FCM) and needs iOS (APNs) support added.

## Prerequisites

1. Apple Developer Account (paid membership required)
2. Xcode installed (latest version recommended)
3. iOS device or simulator for testing
4. Supabase project with Edge Functions access

## Step 1: Generate APNs Key

1. **Log in to Apple Developer Portal**
   - Go to https://developer.apple.com/account
   - Sign in with your Apple Developer account

2. **Create APNs Key**
   - Navigate to: Certificates, Identifiers & Profiles → Keys
   - Click "+" to create a new key
   - Name: "Benjamin Push Notifications" (or similar)
   - Enable "Apple Push Notifications service (APNs)"
   - Click "Continue" → "Register"
   - **Download the .p8 key file** (you can only download once!)
   - **Note the Key ID** (10-character string)
   - **Note your Team ID** (found in top-right of Developer Portal)

3. **Store Key Securely**
   - Save the .p8 file securely (never commit to git)
   - You'll need: Key ID, Team ID, and Bundle ID

## Step 2: Configure Supabase Edge Functions

### Environment Variables

Add these to your Supabase project secrets (Dashboard → Settings → Edge Functions → Secrets):

```bash
# APNs Configuration
APNS_KEY_ID=YOUR_KEY_ID          # 10-character key ID from Apple
APNS_TEAM_ID=YOUR_TEAM_ID        # Your Apple Developer Team ID
APNS_BUNDLE_ID=com.benjamin.app  # Your app's bundle ID
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----  # Full .p8 file content
APNS_ENVIRONMENT=production      # or "development" for sandbox
```

### Getting APNS_KEY_CONTENT

1. Open the downloaded .p8 file in a text editor
2. Copy the entire content (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
3. Replace newlines with `\n` for the environment variable
4. Or use base64 encoding (preferred):

```bash
# Convert .p8 to base64
cat AuthKey_XXXXXXXXXX.p8 | base64
```

Then in Edge Function, decode it:
```typescript
const keyContent = atob(Deno.env.get("APNS_KEY_CONTENT_BASE64") || "");
```

## Step 3: Update Edge Functions

### Files to Modify

1. `supabase/functions/notify-order-event/index.ts`
2. `supabase/functions/notify-message-event/index.ts`

### Implementation Pattern

Add APNs client alongside existing FCM client:

```typescript
// Detect platform from token or device metadata
const platform = device.platform; // 'ios' | 'android' | 'web'

if (platform === 'android') {
  // Use existing FCM implementation
  await sendAndroidPush({ ... });
} else if (platform === 'ios') {
  // Use new APNs implementation
  await sendIOSPush({ ... });
}
```

### APNs HTTP/2 API Client

Create `sendIOSPush` function similar to `sendAndroidPush`:

```typescript
async function sendIOSPush(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  const keyContent = Deno.env.get("APNS_KEY_CONTENT");
  const environment = Deno.env.get("APNS_ENVIRONMENT") || "production";
  
  if (!keyId || !teamId || !bundleId || !keyContent) {
    throw new Error("APNs configuration missing");
  }
  
  // APNs uses JWT authentication (similar to FCM)
  const jwt = await createAPNsJWT(keyId, teamId, keyContent);
  
  // APNs endpoint (production or sandbox)
  const apnsUrl = environment === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
  
  // Build APNs payload
  const payload = {
    aps: {
      alert: {
        title: params.title,
        body: params.body,
      },
      sound: "default",
      badge: 1, // Optional: unread count
    },
    ...params.data, // Custom data payload
  };
  
  // Send via APNs HTTP/2 API
  const response = await fetch(`${apnsUrl}/3/device/${params.token}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `APNs error: ${response.status} ${errorText}`,
    };
  }
  
  return { success: true };
}
```

### JWT Creation for APNs

```typescript
async function createAPNsJWT(keyId: string, teamId: string, keyContent: string): Promise<string> {
  // Similar to FCM JWT creation
  // Use RS256 algorithm
  // Claims: iss (teamId), iat (current time), exp (iat + 1 hour)
  // Sign with the .p8 private key
  // Implementation similar to createJWT for FCM
}
```

## Step 4: iOS App Configuration

### Info.plist

Ensure these entries exist in `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### Capabilities

1. Open Xcode project: `npx cap open ios`
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" → Enable "Remote notifications"

### Capacitor Configuration

Verify `capacitor.config.ts` has correct `appId`:

```typescript
{
  appId: 'com.benjamin.app', // Must match APNS_BUNDLE_ID
  // ...
}
```

## Step 5: Token Registration

### iOS Token Format

iOS tokens from Capacitor are strings (different format than Android FCM tokens). They're stored in `user_push_tokens` table with `platform: 'ios'`.

### Verify Token Storage

1. Check `user_push_tokens` table after iOS app registration
2. Token should be stored with `platform = 'ios'`
3. Token format: Long alphanumeric string (different from Android)

## Step 6: Testing

### Test Plan

#### Foreground Toast
1. Open iOS app (foreground)
2. Trigger push notification (via test button or real event)
3. Verify toast appears at top-center
4. Verify toast doesn't cause layout shift
5. Verify "Open chat" button works (for messages)

#### Background System Notification
1. Put iOS app in background
2. Trigger push notification
3. Verify system notification appears in notification shade
4. Verify notification shows title and body
5. Tap notification
6. Verify app opens to correct screen

#### Tap Notification Action
1. Receive background notification
2. Tap notification
3. Verify app navigates to:
   - Chat screen (for message notifications)
   - Order detail screen (for order notifications)

### Test Commands

```bash
# Sync Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios

# Build and run on simulator
# (Use Xcode: Product → Run)

# Or use CLI (if configured)
npx cap run ios
```

## Step 7: Environment-Specific Configuration

### Development (Sandbox)
- Use `APNS_ENVIRONMENT=development`
- APNs endpoint: `https://api.sandbox.push.apple.com`
- Tokens from development builds

### Production
- Use `APNS_ENVIRONMENT=production`
- APNs endpoint: `https://api.push.apple.com`
- Tokens from App Store builds

## Troubleshooting

### Common Issues

1. **"Invalid token"**
   - Verify token is from correct environment (dev vs prod)
   - Check bundle ID matches APNS_BUNDLE_ID
   - Ensure token hasn't expired

2. **"Authentication failed"**
   - Verify APNs key ID, team ID, and key content are correct
   - Check JWT expiration (should be < 1 hour)
   - Verify key has APNs permission enabled

3. **"Topic mismatch"**
   - Ensure bundle ID in payload matches APNS_BUNDLE_ID
   - Check app's bundle ID in Xcode matches

4. **No notifications received**
   - Verify push permissions are granted
   - Check device is connected to internet
   - Verify Edge Function is being called
   - Check Edge Function logs for errors

## Implementation Checklist

- [ ] Generate APNs key in Apple Developer Portal
- [ ] Download and securely store .p8 key file
- [ ] Note Key ID, Team ID, and Bundle ID
- [ ] Add APNs environment variables to Supabase secrets
- [ ] Implement `sendIOSPush` function in Edge Functions
- [ ] Implement APNs JWT creation
- [ ] Update `notify-order-event` to route iOS tokens to APNs
- [ ] Update `notify-message-event` to route iOS tokens to APNs
- [ ] Configure iOS app capabilities (Push Notifications, Background Modes)
- [ ] Test foreground toast notifications
- [ ] Test background system notifications
- [ ] Test tap notification navigation
- [ ] Verify token storage in `user_push_tokens` table

## Next Steps After Setup

1. **Monitor APNs Delivery**
   - Track delivery success rate
   - Monitor error rates
   - Set up alerts for failures

2. **Optimize Payloads**
   - Add badge counts for unread messages
   - Customize notification sounds
   - Add rich notifications (images, actions)

3. **Production Deployment**
   - Switch to production APNs endpoint
   - Update environment variables
   - Test with App Store build

## References

- [Apple Push Notification Service Documentation](https://developer.apple.com/documentation/usernotifications)
- [APNs HTTP/2 API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)

