# Android Release Checklist

## Layout Sanity Checks

### Home Screen (`/customer/home`)
- [ ] Page loads without blank bottom half
- [ ] Can scroll to bottom of trust cards list
- [ ] "View All Deliveries" button is visible and clickable
- [ ] Last delivery card (if exists) is fully visible
- [ ] No content cut off at bottom
- [ ] Header remains fixed at top while scrolling

### Cash Request Flow - Step 1 (`/customer/request?step=1`)
- [ ] Address list scrolls smoothly
- [ ] Map preview doesn't interfere with scrolling (requires 2-finger pan)
- [ ] Can scroll to see all addresses
- [ ] Bottom "Continue" button remains visible
- [ ] No content hidden behind bottom button

### Cash Request Flow - Step 2 (`/customer/request?step=2`)
- [ ] Cash amount section is visible
- [ ] Bank account selection works
- [ ] Can scroll to see fee breakdown (if expanded)
- [ ] Bottom "Continue" button remains visible
- [ ] No content cut off

### Cash Request Flow - Step 3 (`/customer/request?step=3`)
- [ ] Delivery style options are visible
- [ ] Can scroll through all options
- [ ] Bottom "Confirm Request" button remains visible
- [ ] No content hidden

### Track Order Screen (`/customer/tracking/:orderId`)
- [ ] Order details are visible
- [ ] Can scroll through all status updates
- [ ] Map (if present) doesn't interfere with scrolling
- [ ] Bottom actions remain visible
- [ ] No content cut off at bottom

### Account Page (`/customer/account`)
- [ ] Profile form is visible
- [ ] Can scroll to see all fields (name, email, phone)
- [ ] Account Status section (Identity/Rating) is visible
- [ ] Delete Account section is accessible
- [ ] No content cut off at bottom

## Map Preview Gesture Handling

### Address Selection (Step 1)
- [ ] Single finger scroll scrolls the address list (not the map)
- [ ] Two-finger pan moves the map
- [ ] Google Maps shows "Use two fingers to move the map" hint (if applicable)
- [ ] No accidental map navigation when scrolling addresses

## Push Notifications

### Foreground Push (In-App Toast)
- [ ] App is in foreground
- [ ] Push notification received
- [ ] Toast appears at top-center
- [ ] Toast doesn't cause layout shift
- [ ] Toast auto-dismisses after duration
- [ ] Can interact with page while toast is visible
- [ ] "Open chat" button works (for message notifications)
- [ ] Toast doesn't appear if user is already in relevant chat

### Background Push (System Notification)
- [ ] App is in background
- [ ] Push notification received
- [ ] System notification appears in notification shade
- [ ] Notification shows title and body
- [ ] Tapping notification opens correct screen
- [ ] App navigates to relevant chat/order detail

### Push Notification Logging
- [ ] Foreground path logs: `[Push Notifications] 📩 PUSH RECEIVED`
- [ ] Background path logs: System notification (no in-app toast)
- [ ] Tap action path logs: `[Push Notifications] 👉 PUSH ACTION`

## Realtime Reliability

### Order Updates
- [ ] Order status changes appear in real-time
- [ ] No CHANNEL_ERROR spam in console
- [ ] Realtime failures gracefully degrade to polling
- [ ] Unread message counts update correctly

### Chat Messages
- [ ] New messages appear in real-time
- [ ] No CHANNEL_ERROR spam for chat channels
- [ ] Chat works even if realtime fails (via polling)

## Toaster Layout Regression Prevention

### Toaster Placement
- [ ] ToasterPortal is mounted ONLY in `main.tsx` at app root
- [ ] No Toaster components mounted inside page layouts
- [ ] No layout shift when toast appears
- [ ] Dev warning appears if ToasterPortal is mounted in wrong place

## Back Button Behavior

- [ ] Navigate through flow: Home → Request Step 1 → Step 2 → Step 3
- [ ] Press Android back button on Step 3 → Returns to Step 2
- [ ] Press back on Step 2 → Returns to Step 1
- [ ] Press back on Step 1 → Returns to Home
- [ ] Press back on Home → Exits app (or shows exit confirmation)

## Known Issues / Caveats

- Document any remaining Android-specific issues here
- Note any workarounds or limitations

## Sign-off

- [ ] All critical tests passed
- [ ] No layout regressions
- [ ] No console spam (CHANNEL_ERROR)
- [ ] Push notifications work in foreground and background
- [ ] Ready for release

**Tester:** _________________  
**Date:** _________________  
**Build Version:** _________________

