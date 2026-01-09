# Android Closeout Sprint Report

## Files to Touch

### Phase A1 - Layout Baseline
- `src/index.css` - Root height rules, mobile-app-viewport constraints
- `src/components/layout/CustomerLayout.tsx` - Root layout container
- `src/pages/customer/components/CustomerScreen.tsx` - Scroll container pattern
- `src/pages/customer/CustomerHome.tsx` - Home page layout
- `src/pages/customer/CashRequest.tsx` - Request flow layout
- `src/pages/Account.tsx` - Account page layout

### Phase A2 - Toaster
- `src/components/ui/ToasterPortal.tsx` - Already portaled ✓
- `src/components/ui/toast.tsx` - Viewport positioning
- `src/main.tsx` - Single mount point
- `src/pages/customer/CustomerHome.tsx` - Dev test button

### Phase A3 - Map Gesture Handling
- `src/components/maps/BenjaminMap.tsx` - Gesture handling logic
- `src/components/customer/RequestFlowMapLayer.tsx` - Preview map usage

### Phase A4 - Account Screen
- `src/pages/Account.tsx` - Already implemented ✓
- `src/components/account/AccountSummaryCard.tsx` - Already implemented ✓
- `src/components/account/DeleteAccountSection.tsx` - Already implemented ✓

## Root Causes of Sliced Screen Issues

1. **Flexbox Height Chain**: Missing `min-h-0` on flex children that need to scroll
2. **100vh Misuse**: Using `h-screen` or `100vh` inside nested flex contexts causes cropping
3. **Overflow Conflicts**: Multiple scroll containers competing
4. **Missing Height Constraints**: Root containers not properly constrained

## Commit Plan

1. `fix(android): stabilize root layout + scrolling` - A1 layout baseline
2. `fix(android): toast system is portal-only + no layout impact` - A2 toaster verification
3. `fix(android): cooperative gesture handling for embedded maps` - A3 map gestures
4. `docs(android): add canonical scrollable page pattern` - Documentation
5. `test(android): add QA script for release sanity` - A5 QA script

## Status

- [x] A1 Layout Baseline - Complete
- [x] A2 Toaster Verification - Complete
- [x] A3 Map Gesture Handling - Complete
- [x] A4 Account Screen - Already Complete
- [x] A5 QA Script - Complete
- [x] B iOS Readiness Plan - Complete

## Summary

### Completed Tasks

1. **A1 Layout Baseline**
   - Created canonical scrollable page pattern documentation (`docs/LAYOUT_PATTERN.md`)
   - Verified root layout containers use correct height constraints
   - Confirmed `CustomerScreen` follows standard pattern
   - No `h-screen` misuse found in customer pages

2. **A2 Toaster Verification**
   - Toaster is portaled via `ToasterPortal` component
   - Single mount point in `main.tsx`
   - Dev test button exists in `CustomerHome.tsx`
   - Toast viewport uses `fixed` positioning with high z-index
   - No layout impact confirmed

3. **A3 Map Gesture Handling**
   - Fixed map recreation logic for gesture handling changes
   - Removed incorrect `setOptions` call for gestureHandling (must be set at creation)
   - Verified `minimal={true}` defaults to `cooperative` gesture handling
   - `RequestFlowMapLayer` correctly uses `gestureHandling="cooperative"`

4. **A4 Account Screen**
   - Verification wording: "Identity: Verified/Not verified" (not "Bank Connected")
   - Delete Account flow implemented with collapsible section
   - Smooth animation matching bank dropdown style
   - All requirements met

5. **A5 QA Script**
   - Created comprehensive 10-minute QA script (`docs/ANDROID_QA_SCRIPT.md`)
   - Covers scroll sanity, toast test, map gestures, back button, account screen
   - Includes regression checks for previously reported issues

6. **B iOS Readiness Plan**
   - Created iOS readiness plan (`docs/IOS_READINESS_PLAN.md`)
   - Identified iOS-specific requirements (APNs, safe areas, etc.)
   - Confirmed layout baseline is platform-agnostic
   - Provided implementation checklist

### Files Changed

1. `src/components/maps/BenjaminMap.tsx` - Fixed gesture handling recreation logic
2. `docs/LAYOUT_PATTERN.md` - Canonical pattern documentation (NEW)
3. `docs/ANDROID_QA_SCRIPT.md` - QA test script (NEW)
4. `docs/IOS_READINESS_PLAN.md` - iOS readiness plan (NEW)
5. `ANDROID_CLOSEOUT_REPORT.md` - This report (NEW)

### No Changes Needed

- `src/index.css` - Already uses correct height constraints
- `src/components/layout/CustomerLayout.tsx` - Already follows pattern
- `src/pages/customer/components/CustomerScreen.tsx` - Already follows pattern
- `src/components/ui/ToasterPortal.tsx` - Already portaled correctly
- `src/main.tsx` - Already mounts ToasterPortal correctly
- `src/pages/Account.tsx` - Already complete

