# Android QA Script (10 Minutes)

## Pre-requisites
- Android device or emulator running the app
- App built and installed (latest from main branch)

## Test Checklist

### 1. Scroll Sanity (2 minutes)

#### Home Page (`/customer/home`)
- [ ] Page loads without blank bottom half
- [ ] Can scroll through trust cards
- [ ] "View All Deliveries" button is visible and clickable
- [ ] Last delivery card (if exists) is fully visible
- [ ] No content is cut off at bottom

#### Cash Request Flow - Step 1 (`/customer/request?step=1`)
- [ ] Address list scrolls smoothly
- [ ] Map preview doesn't interfere with scrolling
- [ ] Can scroll to see all addresses
- [ ] Bottom "Continue" button remains visible

#### Cash Request Flow - Step 2 (`/customer/request?step=2`)
- [ ] Cash amount section is visible
- [ ] Bank account selection works
- [ ] Can scroll to see fee breakdown (if expanded)
- [ ] Bottom "Continue" button remains visible

#### Cash Request Flow - Step 3 (`/customer/request?step=3`)
- [ ] Delivery style options are visible
- [ ] Can scroll through options
- [ ] Bottom "Confirm Request" button remains visible

#### Account Page (`/customer/account`)
- [ ] Profile form is visible
- [ ] Can scroll to see all fields (name, email, phone)
- [ ] Account Status section (Identity/Rating) is visible
- [ ] Delete Account section is accessible
- [ ] No content cut off at bottom

### 2. Toast Test (1 minute)

#### Manual Toast Trigger
- [ ] Open home page
- [ ] Click "DEV: Test Toast" button (top-left, dev-only)
- [ ] Toast appears at top-center
- [ ] Toast doesn't cause layout shift
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Can interact with page while toast is visible

#### Foreground Push Notification Toast
- [ ] Ensure app is in foreground
- [ ] Click "DEV: Test Push" button (top-left, dev-only)
- [ ] Push notification triggers
- [ ] Toast appears with notification content
- [ ] "Open chat" button works (if message notification)
- [ ] No layout shift when toast appears

### 3. Map Gesture Test (2 minutes)

#### Address Selection Map Preview
- [ ] Navigate to `/customer/request?step=1`
- [ ] Scroll through address list with ONE finger
- [ ] List scrolls smoothly (map doesn't move)
- [ ] Use TWO fingers to pan the map
- [ ] Map moves with two-finger gesture
- [ ] Google Maps shows "Use two fingers to move the map" hint (if applicable)

#### Full-Screen Map (if applicable)
- [ ] Navigate to any full-screen map view
- [ ] Single finger pan works normally
- [ ] Map responds to single-finger gestures

### 4. Back Button Behavior (1 minute)

- [ ] Navigate through flow: Home → Request Step 1 → Step 2 → Step 3
- [ ] Press Android back button on Step 3
- [ ] Returns to Step 2 (not exits app)
- [ ] Press back on Step 2 → Returns to Step 1
- [ ] Press back on Step 1 → Returns to Home
- [ ] Press back on Home → Exits app (or shows exit confirmation if implemented)

### 5. Account Screen Verification (2 minutes)

#### Identity Verification
- [ ] Navigate to `/customer/account`
- [ ] "Identity" row shows correct status:
  - [ ] "Verified" with green check (if bank connected)
  - [ ] "Not verified" with amber dot (if no bank)
- [ ] Clicking "Not verified" navigates to `/customer/banks`
- [ ] "Verified" tooltip shows on click (if verified)

#### Rating Display
- [ ] Rating row shows correct value:
  - [ ] "New" if count < 5
  - [ ] "{avg} ★ (count)" if count >= 5
- [ ] Rating matches menu rating (single source of truth)

#### Delete Account
- [ ] "Delete Account" section is visible
- [ ] Click chevron to expand
- [ ] Smooth expand animation (matches bank dropdown style)
- [ ] Warning text is visible
- [ ] "Delete Account" button is visible
- [ ] Click "Delete Account" → Confirmation dialog appears
- [ ] Cancel works, dialog closes
- [ ] Confirm deletion → Account deleted, signed out, redirected to auth

### 6. Layout Regression Check (2 minutes)

#### Visual Inspection
- [ ] No "sliced in middle" appearance on any screen
- [ ] No blank white space at bottom
- [ ] All content is accessible via scrolling
- [ ] Headers remain fixed at top
- [ ] Bottom bars/CTAs remain fixed at bottom
- [ ] No horizontal scrolling (overflow-x hidden)

#### Specific Problem Areas (previously reported)
- [ ] Address/Amount/Track Order flows: Full content visible
- [ ] Account page: All sections accessible
- [ ] Home page: Trust cards and delivery card visible

## Known Issues / Caveats

- [ ] Document any remaining Android-specific issues here
- [ ] Note any workarounds or limitations

## Sign-off

- [ ] All critical tests passed
- [ ] No layout regressions
- [ ] Ready for release

**Tester:** _________________  
**Date:** _________________  
**Build Version:** _________________

