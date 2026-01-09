# iOS Bring-up Status

## ✅ Completed

### Phase 1: iOS Project Bring-up (Code Ready)
- ✅ Capacitor config verified (`appId: 'com.benjamin.app'`)
- ✅ Push notifications plugin installed
- ✅ iOS setup commands documented (`IOS_SETUP_COMMANDS.md`)

**Pending (Run Locally):**
```bash
npx cap sync ios
npx cap open ios
# Build and run in Xcode
```

### Phase 2: iOS Push Token Registration
- ✅ iOS-specific logging added:
  - `[Push][iOS] permission: granted/denied`
  - `[Push][iOS] token: ...`
  - `[Push][iOS] saved: ok/error`
- ✅ Token storage function returns boolean for status checking
- ✅ Platform detection works correctly

**Verification:**
- Token should be stored in `user_push_tokens` with `platform = 'ios'`
- Check console logs on iOS device launch

### Phase 3: APNs Routing in Edge Functions
- ✅ **notify-order-event**: APNs implementation complete
- ✅ **notify-message-event**: APNs implementation complete
- ✅ Platform routing: `android` → FCM, `ios` → APNs
- ✅ APNs JWT creation with ES256 (ECDSA P-256)
- ✅ Development/production environment support
- ✅ Proper logging: `[APNs] ✅ Push sent successfully` with provider/platform/token prefix

**Implementation Details:**
- APNs HTTP/2 API client
- JWT authentication with .p8 key
- Required headers: `Authorization`, `apns-topic`, `apns-push-type`, `apns-priority`
- Error handling and logging

## 📋 Required Supabase Secrets

Add to Supabase Dashboard → Settings → Edge Functions → Secrets:

```
APNS_KEY_ID=XXXXXXXXXX          # 10-character key ID from Apple
APNS_TEAM_ID=YYYYYYYYYY          # Apple Developer Team ID
APNS_BUNDLE_ID=com.benjamin.app  # Must match capacitor.config.ts
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_ENVIRONMENT=development     # or "production"
```

See `docs/IOS_APNS_RUNBOOK.md` for detailed setup instructions.

## 🚀 Next Steps

### 1. Run iOS Setup Commands
Follow `IOS_SETUP_COMMANDS.md`:
- `npx cap sync ios`
- `npx cap open ios`
- Build and run on simulator
- Fix any pod/config issues

### 2. Test on Physical Device
- **Critical**: Simulator tokens may not work with APNs
- Use physical iOS device for push notification testing
- Verify token registration in database
- Test push notification delivery

### 3. Configure APNs Secrets
- Generate APNs key in Apple Developer Portal
- Add all 5 secrets to Supabase
- Test push notification via Edge Function

### 4. Verify End-to-End
- Foreground push → Toast appears
- Background push → System notification appears
- Tap notification → Deep links correctly

## 📝 Files Changed

1. `src/lib/pushNotifications.ts` - iOS logging and token storage
2. `supabase/functions/notify-order-event/index.ts` - APNs routing
3. `supabase/functions/notify-message-event/index.ts` - APNs routing
4. `docs/IOS_APNS_RUNBOOK.md` - APNs setup and testing guide
5. `IOS_SETUP_COMMANDS.md` - Step-by-step setup commands

## ⚠️ Important Notes

1. **Physical Device Required**: APNs tokens from simulator may not work. Use physical device for real testing.

2. **Environment Matching**: 
   - Development builds → `APNS_ENVIRONMENT=development` → Sandbox endpoint
   - App Store builds → `APNS_ENVIRONMENT=production` → Production endpoint

3. **Bundle ID Must Match**: `APNS_BUNDLE_ID` must exactly match `capacitor.config.ts` `appId`

4. **Key Content Format**: APNS_KEY_CONTENT should include full PEM with newlines as `\n`

## Status

**Code Implementation:** ✅ Complete  
**iOS Project Creation:** ⏳ Pending (run `npx cap sync ios`)  
**APNs Configuration:** ⏳ Pending (add secrets to Supabase)  
**Physical Device Testing:** ⏳ Pending

