# Customer Mobile Viewport Fix

## Issue
Customer app was rendering as web/responsive instead of mobile app viewport (phone frame), while Runner app was correctly showing as mobile app.

## Root Cause
The viewport logic was relying on `getAppliedMode` which could be influenced by localStorage values from the old viewport toggle. Even though the toggle was removed, saved viewport mode values could override route-based detection.

## Solution
1. **Simplified viewport logic**: Directly check route paths instead of relying on `appliedMode` variable
2. **Force mobile viewport for customer routes**: Customer routes (`/customer/*`) now ALWAYS get `mobile-app-viewport` class, regardless of any saved state
3. **Clear localStorage**: Automatically clear any saved viewport mode from localStorage on app load
4. **Direct route checking**: Use `location.pathname.startsWith('/customer')` directly in the hook instead of relying on helper functions

## Changes Made

### `src/hooks/useViewport.ts`
- **Direct route checking**: Added explicit checks for `isCustomerRoute`, `isRunnerRoute`, `isAdminRoute` directly in the `useViewport` hook
- **Force mobile viewport**: Customer and Runner routes ALWAYS get `mobile-app-viewport` class applied
- **Clear localStorage**: Automatically remove any saved viewport mode on each route change
- **Simplified logic**: Removed dependency on `appliedMode` variable for route detection

## Result
- ✅ Customer routes (`/customer/*`) now ALWAYS render with mobile app viewport (phone frame)
- ✅ Runner routes (`/runner/*`) continue to render with mobile app viewport (phone frame)
- ✅ Admin routes (`/admin/*`) render with responsive viewport (full width)
- ✅ No localStorage interference: Any saved viewport mode is automatically cleared
- ✅ Phone frame CSS is applied correctly for customer and runner apps

## Testing
1. Navigate to `/customer/home` - should show phone frame
2. Navigate to `/runner/home` - should show phone frame
3. Navigate to `/admin/dashboard` - should show full width (no phone frame)
4. Check browser console for viewport logs in dev mode
5. Verify `body.mobile-app-viewport` class is applied for customer/runner routes

## Files Modified
- `src/hooks/useViewport.ts` - Simplified viewport logic, direct route checking, force mobile viewport for customer routes

