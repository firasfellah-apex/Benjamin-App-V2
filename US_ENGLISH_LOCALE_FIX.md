# US English Locale Fix

## Issue
Date and time formatting was showing Chinese characters (e.g., "2025年11月8日") instead of US English format (e.g., "Nov 8, 2025").

## Root Cause
The `formatDate` utility function in `src/lib/utils.ts` was using `"zh-CN"` (Chinese) locale instead of `"en-US"` (US English). Additionally, several direct date formatting calls throughout the codebase were missing explicit locale parameters, causing them to use browser/system defaults.

## Solution
Changed all date/time formatting to explicitly use `'en-US'` locale for consistent US English formatting across the entire application.

## Files Modified

### 1. `src/lib/utils.ts`
- **Changed**: `formatDate()` function locale from `"zh-CN"` to `"en-US"`
- **Impact**: All uses of `formatDate()` now display in US English format

### 2. `src/pages/admin/AdminOrderDetail.tsx`
- **Fixed**: 5 instances of `toLocaleString()` → `toLocaleString('en-US')`
- **Locations**: Created date, runner accepted date, OTP expires date, cancelled date, timeline timestamps

### 3. `src/pages/admin/Dashboard.tsx`
- **Fixed**: 2 instances
  - `toLocaleDateString()` → `toLocaleDateString('en-US')`
  - `toLocaleTimeString()` → `toLocaleTimeString('en-US')`

### 4. `src/pages/runner/RunnerHome.tsx`
- **Fixed**: 2 instances
  - `toLocaleTimeString([], {...})` → `toLocaleTimeString('en-US', {...})`
  - `toLocaleDateString()` → `toLocaleDateString('en-US')`

### 5. `src/pages/runner/MyDeliveries.tsx`
- **Fixed**: 2 instances
  - `toLocaleString()` → `toLocaleString('en-US')`
  - `toLocaleDateString()` → `toLocaleDateString('en-US')`

### 6. `src/pages/admin/UserManagement.tsx`
- **Fixed**: 1 instance
  - `toLocaleDateString()` → `toLocaleDateString('en-US')`

### 7. `src/pages/admin/OrderMonitoring.tsx`
- **Fixed**: 1 instance
  - `toLocaleString()` → `toLocaleString('en-US')`

### 8. `src/pages/runner/RunnerOrderDetail.tsx`
- **Fixed**: 1 instance
  - `toLocaleString()` → `toLocaleString('en-US')`

### 9. `src/pages/Account.tsx`
- **Fixed**: 1 instance
  - `toLocaleDateString()` → `toLocaleDateString('en-US')`

### 10. `src/pages/admin/InvitationManagement.tsx`
- **Fixed**: 2 instances
  - `toLocaleDateString()` → `toLocaleDateString('en-US')` (both in dialog and table)

### 11. `src/pages/runner/AvailableOrders.tsx`
- **Fixed**: 1 instance
  - `toLocaleTimeString([], {...})` → `toLocaleTimeString('en-US', {...})`

## Date Format Examples

### Before (Chinese)
- `2025年11月8日` (Chinese characters for year, month, day)

### After (US English)
- `Nov 8, 2025` (US English format)
- `11/8/2025` (US date format)
- `9:23 PM` (US time format with AM/PM)

## Verification

All date/time formatting now uses:
- ✅ `formatDate()` → Uses `'en-US'` locale
- ✅ `toLocaleString()` → Explicitly uses `'en-US'` locale
- ✅ `toLocaleDateString()` → Explicitly uses `'en-US'` locale
- ✅ `toLocaleTimeString()` → Explicitly uses `'en-US'` locale

## Note

The only remaining `toLocaleString()` without explicit locale is in `src/components/ui/chart.tsx`, which is used for number formatting (not dates), so it's acceptable to use the browser's default locale for number formatting.

## Result

✅ All dates and times now display in US English format
✅ Consistent formatting across all pages (Customer, Runner, Admin)
✅ No Chinese characters in date/time displays
✅ US date/time conventions (MM/DD/YYYY, AM/PM) throughout









