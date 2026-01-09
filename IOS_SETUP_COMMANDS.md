# iOS Setup Commands

## Phase 1: iOS Project Bring-up

Run these commands to create and build the iOS project:

```bash
# 1. Sync Capacitor iOS project
npx cap sync ios

# 2. If pods fail, install CocoaPods dependencies
cd ios/App
pod install
cd ../..

# 3. Re-sync after pod install
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

## Phase 2: Build in Xcode

1. Select iOS Simulator (iPhone 14 Pro recommended)
2. Build and run: Product → Run (⌘R)
3. Fix any build issues:
   - Deployment target mismatches
   - Signing/provisioning errors
   - Missing entitlements

## Phase 3: Verify App Boots

- App should launch without crashes
- Check console for any errors
- Navigate through key flows:
  - `/customer/home`
  - `/customer/request?step=1`
  - `/customer/request?step=2`
  - `/customer/request?step=3`
  - `/customer/tracking/:orderId`

## Phase 4: Push Token Registration

1. Launch app on **physical iOS device** (simulator tokens may not work)
2. Grant push notification permission
3. Check console logs:
   - `[Push][iOS] permission: granted`
   - `[Push][iOS] token: ...`
   - `[Push][iOS] saved: ok`
4. Verify in database:
   ```sql
   SELECT * FROM user_push_tokens WHERE platform = 'ios' ORDER BY updated_at DESC LIMIT 1;
   ```

## Phase 5: Configure APNs Secrets

Add to Supabase Dashboard → Settings → Edge Functions → Secrets:

```
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=YYYYYYYYYY
APNS_BUNDLE_ID=com.benjamin.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_ENVIRONMENT=development
```

## Phase 6: Test APNs Push

1. Get iOS token from database
2. Call Edge Function test endpoint (see `docs/IOS_APNS_RUNBOOK.md`)
3. Verify push received on device
4. Check Edge Function logs for `[APNs] ✅ Push sent successfully`

