# Rounded-Full Audit - Where It Still Exists

## ✅ Canonical UI Components (NO rounded-full)

### `src/components/ui/button.tsx`
- **Status:** ✅ Clean
- **Base class:** `rounded-xl` (12px)
- **No `rounded-full` variants**

### `src/components/ui/icon-button.tsx`
- **Status:** ✅ Clean
- **Base class:** `rounded-xl` (12px)
- **No `rounded-full` variants**
- **Default:** `w-10 h-10`, `bg-[#F7F7F7]`, no border

### `src/components/ui/input.tsx`
- **Status:** ✅ Clean
- **Base class:** `rounded-xl` (12px)
- **No `rounded-full` variants**

---

## Files with `rounded-full` (Intentional vs Needs Refactor)

### 1. **Skeleton Loaders** (Intentional - OK to keep)
- `src/components/address/AddressSelector.tsx` (lines 401, 405, 419, 429, 430)
- **Reason:** Loading skeletons for avatars and progress dots
- **Action:** ✅ Keep as-is

### 2. **Avatar Components** (Intentional - OK to keep)
- `src/components/ui/avatar.tsx`
- **Reason:** Avatars are intentionally circular
- **Action:** ✅ Keep as-is

### 3. **UI Primitives** (Intentional - OK to keep)
- `src/components/ui/slider.tsx` - Slider track and thumb
- `src/components/ui/progress.tsx` - Progress bar
- `src/components/ui/scroll-area.tsx` - Scrollbar
- `src/components/ui/drawer.tsx` - Drawer handle
- `src/components/ui/switch.tsx` - Switch toggle
- `src/components/ui/radio-group.tsx` - Radio buttons
- `src/components/ui/carousel.tsx` - Carousel navigation
- **Reason:** These are intentionally pill-shaped UI elements
- **Action:** ✅ Keep as-is

### 4. **Status Chips** (Intentional - OK to keep)
- `src/components/ui/StatusChip.tsx`
- **Reason:** Status chips are intentionally pill-shaped
- **Action:** ✅ Keep as-is

### 5. **Multi-Select Chips** (Intentional - OK to keep)
- `src/components/ui/multi-select.tsx`
- **Reason:** Selection chips are intentionally pill-shaped
- **Action:** ✅ Keep as-is

### 6. **Info Tooltip** (Intentional - OK to keep)
- `src/components/ui/InfoTooltip.tsx`
- **Reason:** Tooltip icons are intentionally circular
- **Action:** ✅ Keep as-is

---

## Files with `rounded-full` (Needs Review - May Need Refactor)

### 1. **CustomerButton Component**
- `src/pages/customer/components/CustomerButton.tsx`
- **Status:** ⚠️ Needs review
- **Action:** Check if this should use canonical `Button` instead

### 2. **Manage Addresses Page**
- `src/pages/customer/ManageAddresses.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` buttons
- **Action:** Replace with `IconButton` component

### 3. **Cash Request Page**
- `src/pages/customer/CashRequest.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` buttons
- **Action:** Replace with `IconButton` component

### 4. **Order Tracking Page**
- `src/pages/customer/OrderTracking.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white/95` button
- **Action:** Replace with `IconButton` component

### 5. **Active Delivery Sheet**
- `src/components/customer/ActiveDeliverySheet.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` button
- **Action:** Replace with `IconButton` component

### 6. **Report Issue Sheet**
- `src/components/customer/ReportIssueSheet.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` button
- **Action:** Replace with `IconButton` component

### 7. **Completion Rating Modal**
- `src/components/customer/CompletionRatingModal.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` button
- **Action:** Replace with `IconButton` component

### 8. **Avatar Crop Modal**
- `src/components/common/AvatarCropModal.tsx`
- **Status:** ⚠️ Has `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` button
- **Action:** Replace with `IconButton` component

### 9. **Other Customer Pages**
- `src/pages/customer/BankAccounts.tsx`
- `src/pages/customer/components/CustomerHeader.tsx`
- `src/components/customer/CashAmountInput.tsx`
- `src/components/customer/TrustCarousel.tsx`
- `src/pages/customer/CustomerHome.tsx`
- `src/pages/Login.tsx`
- `src/pages/customer/OnboardingProfile.tsx`
- `src/pages/runner/RunnerOrderDetail.tsx`
- `src/components/order/CustomerOrderMap.tsx`
- `src/pages/customer/CustomerDeliveryDetail.tsx`
- `src/components/address/AddressForm.tsx`
- **Status:** ⚠️ Needs review
- **Action:** Check each file and replace with canonical components where appropriate

---

## Summary

### ✅ Safe to Keep (Intentional Pills)
- Skeleton loaders
- Avatars
- UI primitives (sliders, progress, switches, radios)
- Status chips
- Multi-select chips
- Tooltip icons

### ⚠️ Needs Refactor (Action Buttons)
- All `w-12 h-12 rounded-full border border-[#F0F0F0] bg-white` buttons should use `IconButton`
- All primary/secondary action buttons should use canonical `Button`
- Check `CustomerButton` component - may need to be replaced with canonical `Button`

---

## Next Steps

1. **Replace all close/X buttons** with `IconButton` component
2. **Replace all action buttons** with canonical `Button` component
3. **Review `CustomerButton`** - determine if it should be replaced or kept as a wrapper
4. **Test each page** after refactoring to ensure visual consistency

