# iOS Readiness Plan

## Overview
This document outlines the differences and requirements for iOS deployment of the Benjamin app, building on the Android closeout work.

## Status
- ✅ Layout baseline is platform-agnostic (uses `100dvh` with fallback)
- ✅ Toast system is portal-based and layout-neutral
- ✅ Map gesture handling works for both platforms
- ✅ Account screen is complete

## iOS-Specific Configuration

### 1. Capacitor iOS Setup

#### Build/Run Instructions
```bash
# Install iOS dependencies
npm install

# Sync Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios

# Build and run from Xcode
```

#### Required Capacitor Plugins
- `@capacitor/push-notifications` - Already configured
- `@capacitor/status-bar` - Already configured
- `@capacitor/splash-screen` - Already configured

### 2. Push Notifications (APNs)

#### Differences from Android (FCM)
- **Provider**: Apple Push Notification service (APNs) instead of FCM
- **Authentication**: APNs Key (.p8) or Certificate-based
- **Edge Function**: `notify-order-event` and `notify-message-event` need APNs support
- **Token Format**: Different token format (APNs device token vs FCM token)

#### Implementation Tasks
1. **APNs Key Setup**
   - Generate APNs Key in Apple Developer Portal
   - Store key ID, team ID, and bundle ID
   - Add to Supabase Edge Function environment

2. **Edge Function Updates**
   - Add APNs HTTP/2 API client to `notify-order-event`
   - Add APNs HTTP/2 API client to `notify-message-event`
   - Detect platform from token format or device metadata
   - Route to appropriate provider (FCM for Android, APNs for iOS)

3. **Capacitor Configuration**
   - Verify `PushNotifications` plugin is registered
   - Request permissions on iOS (different API than Android)
   - Handle token registration

#### Files to Modify
- `supabase/functions/notify-order-event/index.ts` - Add APNs support
- `supabase/functions/notify-message-event/index.ts` - Add APNs support
- `src/lib/pushNotifications.ts` - iOS permission handling

### 3. Background Modes

#### Required Capabilities
- **Push Notifications**: Already enabled via Capacitor plugin
- **Background Fetch**: Not required (app uses foreground notifications)
- **Remote Notifications**: Enabled by PushNotifications plugin

#### Info.plist Configuration
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### 4. Safe Area Insets

#### Current Implementation
- ✅ CSS uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- ✅ Toast viewport includes safe area padding
- ✅ Layout pattern accounts for safe areas

#### iOS-Specific Considerations
- **Notch/Dynamic Island**: Handled by safe area insets
- **Home Indicator**: Handled by `env(safe-area-inset-bottom)`
- **Status Bar**: Handled by Capacitor StatusBar plugin

#### Testing Checklist
- [ ] Toast appears below notch/Dynamic Island
- [ ] Bottom CTAs are above home indicator
- [ ] No content hidden behind safe areas
- [ ] Landscape mode safe areas respected

### 5. Maps Webview Behavior

#### Differences from Android
- **Safari WebView**: Different rendering engine than Chrome
- **Gesture Handling**: Google Maps `gestureHandling: "cooperative"` works the same
- **Performance**: May need different optimization strategies

#### Known Issues
- None identified (gesture handling is cross-platform)

### 6. Layout Baseline Compatibility

#### Android Closeout Work (Platform-Agnostic)
- ✅ Root height uses `100dvh` with `100vh` fallback
- ✅ Flexbox pattern works on both platforms
- ✅ Scroll container pattern is standard
- ✅ No platform-specific hacks

#### iOS-Specific Verification
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro Max (large screen)
- [ ] Test on iPad (if supported)
- [ ] Test in landscape orientation
- [ ] Verify no layout regressions

### 7. App Store Requirements

#### Account Deletion
- ✅ Delete Account feature implemented
- ✅ Soft-delete preserves compliance data
- ✅ Clear UI and confirmation flow

#### Privacy
- [ ] Privacy policy URL configured
- [ ] App tracking transparency (ATT) handled (if applicable)
- [ ] Location permissions properly requested

#### Permissions
- [ ] Location: Required for address selection
- [ ] Camera: Required for avatar upload
- [ ] Notifications: Required for push notifications

## Implementation Checklist

### Phase 1: Initial Setup
- [ ] Run `npx cap sync ios`
- [ ] Verify Xcode project opens without errors
- [ ] Build and run on iOS simulator
- [ ] Verify basic app functionality

### Phase 2: Push Notifications
- [ ] Generate APNs Key
- [ ] Configure Edge Functions for APNs
- [ ] Test push notification delivery
- [ ] Verify foreground toast notifications

### Phase 3: Layout Verification
- [ ] Test all screens on iOS devices
- [ ] Verify safe area insets work correctly
- [ ] Test landscape orientation
- [ ] Verify no layout regressions

### Phase 4: App Store Prep
- [ ] Configure App Store Connect
- [ ] Prepare screenshots and metadata
- [ ] Submit for review

## Files That Will Differ from Android

### New Files (iOS-Specific)
- `ios/App/App/Info.plist` - iOS app configuration
- `ios/App/App.xcodeproj/` - Xcode project files
- `ios/App/App/Assets.xcassets/` - iOS app icons and assets

### Modified Files (Platform Detection)
- `supabase/functions/notify-order-event/index.ts` - Add APNs client
- `supabase/functions/notify-message-event/index.ts` - Add APNs client
- `src/lib/pushNotifications.ts` - iOS permission handling

### Unchanged Files (Platform-Agnostic)
- All layout components (`CustomerLayout`, `CustomerScreen`)
- All UI components
- Toast system
- Map components
- Account screen

## Testing Strategy

### Device Coverage
- iPhone SE (3rd gen) - Small screen
- iPhone 14 - Standard screen
- iPhone 14 Pro Max - Large screen with Dynamic Island
- iPad (if supported) - Tablet layout

### OS Versions
- iOS 15+ (minimum supported)
- iOS 16
- iOS 17
- Latest iOS version

### Key Test Scenarios
1. **Layout**: All screens render correctly
2. **Scrolling**: Smooth scrolling on all pages
3. **Safe Areas**: Content respects notch/home indicator
4. **Push Notifications**: Delivery and foreground handling
5. **Maps**: Gesture handling works correctly
6. **Account**: Verification and delete flow

## Risk Assessment

### Low Risk (Already Handled)
- ✅ Layout system (platform-agnostic)
- ✅ Toast system (portal-based)
- ✅ Map gestures (Google Maps handles cross-platform)

### Medium Risk (Needs Verification)
- ⚠️ Push notifications (APNs integration)
- ⚠️ Safe area insets (needs device testing)
- ⚠️ Performance on older devices

### High Risk (None Identified)
- None

## Next Steps

1. **Complete Android closeout** (current phase)
2. **Set up iOS project** (`npx cap sync ios`)
3. **Implement APNs in Edge Functions**
4. **Test on iOS devices**
5. **Submit to App Store**

## Notes

- Layout baseline from Android closeout is fully compatible with iOS
- No major refactoring needed for iOS
- Primary work is APNs integration and device testing

