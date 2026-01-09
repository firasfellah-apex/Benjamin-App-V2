# iOS Smoke Test Checklist

## Prerequisites
- Xcode installed (latest version)
- iOS Simulator or physical iOS device
- Apple Developer account (for physical device)

## Initial Setup

### 1. Create iOS Project
```bash
npx cap sync ios
npx cap open ios
```

### 2. Build and Run
- Open Xcode project
- Select iOS Simulator (iPhone 14 Pro recommended)
- Build and run (⌘R)
- Fix any immediate build issues:
  - Pod installation errors
  - Deployment target mismatches
  - Signing/provisioning issues
  - Missing entitlements

## Smoke Test Checklist

### ✅ App Boots
- [ ] App launches without crashes
- [ ] Splash screen appears and dismisses
- [ ] No console errors on startup

### ✅ Key Flows Navigate

#### Home Screen
- [ ] Navigate to `/customer/home`
- [ ] Home screen loads
- [ ] Trust cards visible
- [ ] Last delivery card visible (if exists)

#### Request Flow - Step 1 (Address Selection)
- [ ] Navigate to `/customer/request?step=1`
- [ ] Address list loads
- [ ] Map preview visible
- [ ] Can select address
- [ ] "Continue" button works

#### Request Flow - Step 2 (Cash Amount)
- [ ] Navigate to `/customer/request?step=2`
- [ ] Cash amount selector visible
- [ ] Bank account selection works
- [ ] Fee breakdown visible (if expanded)
- [ ] "Continue" button works

#### Request Flow - Step 3 (Delivery Style)
- [ ] Navigate to `/customer/request?step=3`
- [ ] Delivery style options visible
- [ ] Can select delivery style
- [ ] "Confirm Request" button works

#### Tracking Screen
- [ ] Navigate to `/customer/tracking/:orderId` (use existing order)
- [ ] Order details load
- [ ] Status updates visible
- [ ] Map visible (if applicable)

### ✅ Push Token Registration

#### Physical Device (Required for APNs)
- [ ] App requests push notification permission
- [ ] Permission granted
- [ ] Token registered in Capacitor
- [ ] Token stored in `user_push_tokens` table with:
  - `platform = 'ios'`
  - `app_role = 'customer'` (or 'runner')
  - `token` is a valid APNs token (long alphanumeric string)

#### Simulator (Limited)
- [ ] App requests push notification permission
- [ ] Permission granted
- [ ] Token may not be valid for APNs (simulator limitation)
- [ ] Token still stored in database

### ✅ Layout Verification
- [ ] No "sliced screen" issues
- [ ] All content scrollable
- [ ] Headers remain fixed
- [ ] Bottom CTAs remain fixed
- [ ] Safe area insets respected (notch/home indicator)

## Known Limitations

### Simulator
- Push notifications may not work reliably on simulator
- APNs tokens from simulator may not be valid for production
- Use physical device for full push notification testing

### First Build
- May require CocoaPods installation: `cd ios/App && pod install`
- May require Xcode command line tools: `xcode-select --install`
- May require signing/provisioning setup in Xcode

## Next Steps After Smoke Test

1. **If all tests pass:**
   - Proceed to APNs implementation in Edge Functions
   - Test push notifications on physical device
   - Verify deep linking works

2. **If tests fail:**
   - Document specific failures
   - Fix build/config issues
   - Re-run smoke test

## Sign-off

**iOS Smoke Test Status:** [ ] PASSED / [ ] FAILED

**Tester:** _________________  
**Date:** _________________  
**Build Version:** _________________  
**Device/Simulator:** _________________

**Notes:**
- Document any issues found
- Note any workarounds applied
- List next steps

