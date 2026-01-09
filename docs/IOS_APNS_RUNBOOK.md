# iOS APNs Runbook

## Required Supabase Secrets

Add these to Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
# APNs Configuration (from Apple Developer Portal)
APNS_KEY_ID=XXXXXXXXXX          # 10-character key ID
APNS_TEAM_ID=YYYYYYYYYY          # Your Apple Developer Team ID
APNS_BUNDLE_ID=com.benjamin.app  # Must match capacitor.config.ts appId
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_ENVIRONMENT=development     # or "production" for App Store builds
```

### Getting APNS_KEY_CONTENT

1. Download `.p8` key file from Apple Developer Portal
2. Open in text editor
3. Copy entire content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
4. Replace newlines with `\n` for the environment variable
5. Or use base64: `cat AuthKey_XXXXXXXXXX.p8 | base64` and decode in code

## Testing APNs

### 1. Verify Token Registration

**On iOS Device:**
1. Launch app
2. Grant push notification permission
3. Check console logs:
   - `[Push][iOS] permission: granted`
   - `[Push][iOS] token: ...`
   - `[Push][iOS] saved: ok`

**Verify in Database:**
```sql
SELECT user_id, platform, app_role, token, updated_at 
FROM user_push_tokens 
WHERE platform = 'ios' 
ORDER BY updated_at DESC 
LIMIT 5;
```

### 2. Test Push Notification

**Via Edge Function Test:**
```bash
# Get user's iOS token from database
TOKEN="<ios_token_from_database>"

# Call notify-order-event (test path)
curl -X POST https://<project-ref>.supabase.co/functions/v1/notify-order-event \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'"$TOKEN"'",
    "title": "Test Push",
    "body": "This is a test notification"
  }'
```

**Check Edge Function Logs:**
- Look for: `[APNs] ✅ Push sent successfully`
- Check: `provider: "APNs"`, `platform: "ios"`, `environment: "development"`

### 3. Verify Delivery

**Foreground (App Open):**
- Toast appears at top-center
- Log: `[Push Notifications] 📩 FOREGROUND PUSH RECEIVED`

**Background (App Minimized):**
- System notification appears in notification shade
- Tap notification → App opens to correct screen
- Log: `[Push Notifications] 👉 TAP ACTION`

## Troubleshooting

### "APNs configuration missing"
- Verify all 5 secrets are set in Supabase Dashboard
- Check secret names match exactly (case-sensitive)

### "Invalid token"
- Verify token is from correct environment (dev vs prod)
- Check bundle ID matches `APNS_BUNDLE_ID`
- Ensure token hasn't expired

### "Authentication failed"
- Verify key ID, team ID, and key content are correct
- Check JWT expiration (should be < 1 hour)
- Verify key has APNs permission enabled in Apple Developer Portal

### "Topic mismatch"
- Ensure bundle ID in payload matches `APNS_BUNDLE_ID`
- Check app's bundle ID in Xcode matches

### No notifications received
- Verify push permissions are granted
- Check device is connected to internet
- Verify Edge Function is being called (check logs)
- **Important**: Simulator tokens may not work with APNs - use physical device

## Environment-Specific Configuration

### Development (Sandbox)
- `APNS_ENVIRONMENT=development`
- Endpoint: `https://api.sandbox.push.apple.com`
- Tokens from development builds

### Production
- `APNS_ENVIRONMENT=production`
- Endpoint: `https://api.push.apple.com`
- Tokens from App Store builds

## Commands to Run Locally

```bash
# 1. Sync iOS project
npx cap sync ios

# 2. Open in Xcode
npx cap open ios

# 3. Build and run (in Xcode)
# Product → Run (⌘R)

# 4. If pods fail
cd ios/App
pod install
cd ../..

# 5. Re-sync after pod install
npx cap sync ios
```

## Verification Checklist

- [ ] All 5 APNs secrets set in Supabase
- [ ] iOS app builds and runs on simulator
- [ ] Push permission granted
- [ ] Token registered in `user_push_tokens` with `platform = 'ios'`
- [ ] Test push sent via Edge Function
- [ ] Edge Function logs show `[APNs] ✅ Push sent successfully`
- [ ] Foreground push shows toast
- [ ] Background push shows system notification
- [ ] Tap notification deep-links correctly

